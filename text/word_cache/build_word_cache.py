#!/usr/bin/env python3
"""
Orchestrator: builds synonyms, lemmas, joined all_words table,
and inflected synonyms.

Toggle each step with the flags below.
"""

import sqlite3
import subprocess
import sys
import time
from pathlib import Path

from lookup import DEFAULT_DB_PATH as DB_PATH

BUILD_SYNONYMS   = False
BUILD_LEMMAS     = True
BUILD_JOIN       = True

UPOS_COLS = ("ADJ", "ADV", "NOUN", "PROPN", "VERB", "AUX")
PENN_COLS = (
    "JJ", "JJR", "JJS",
    "RB", "RBR", "RBS",
    "NN", "NNS",
    "NNP", "NNPS",
    "VB", "VBD", "VBG", "VBN", "VBP", "VBZ",
    "MD",
)

UPOS_TO_PENN = {
    "ADJ":  ("JJ", "JJR", "JJS"),
    "ADV":  ("RB", "RBR", "RBS"),
    "NOUN": ("NN", "NNS"),
    "PROPN": ("NNP", "NNPS"),
    "VERB": ("VB", "VBD", "VBG", "VBN", "VBP", "VBZ"),
    "AUX":  ("VB", "VBD", "VBG", "VBN", "VBP", "VBZ", "MD"),
}

PROGRESS_INTERVAL = 500


def run_script(name):
    script = Path(__file__).parent / name
    print(f"\n{'='*50}")
    print(f"Running {name}")
    print(f"{'='*50}\n")
    subprocess.run([sys.executable, str(script)], check=True)

def _split(val):
    if not val:
        return []
    return [s.strip() for s in val.split(",") if s.strip()]


def _compute_inflected_synonyms(word, lemma_cache, syn_cache):
    """For a word, find its lemmas, get synonyms of those lemmas,
    then inflect each synonym to match the word's Penn tag."""
    row = lemma_cache.get(word)
    if not row:
        return None

    inflected_syns = set()

    for upos in UPOS_COLS:
        lemma_val = row.get(f"lemma_{upos}")
        if not lemma_val:
            continue

        lemmas = _split(lemma_val)
        penn_tags = UPOS_TO_PENN.get(upos, ())

        matching_tags = []
        for lemma in lemmas:
            lemma_row = lemma_cache.get(lemma)
            if not lemma_row:
                continue
            for ptag in penn_tags:
                infl_val = lemma_row.get(f"infl_{ptag}")
                if infl_val and word in _split(infl_val):
                    matching_tags.append((lemma, ptag))

        for lemma, ptag in matching_tags:
            for syn in syn_cache.get(lemma, []):
                syn_row = lemma_cache.get(syn.strip().lower())
                if syn_row:
                    infl_val = syn_row.get(f"infl_{ptag}")
                    if infl_val:
                        inflected_syns.update(_split(infl_val))

    inflected_syns.discard(word)
    return ",".join(sorted(inflected_syns)) if inflected_syns else None


def build_all_words():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    tables = {r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'")}

    has_syn = "synonyms" in tables
    has_lem = "lemmas" in tables

    if not has_syn and not has_lem:
        print("No source tables found, skipping all_words")
        conn.close()
        return

    cur.execute("DROP TABLE IF EXISTS all_words")

    lemma_cols = (
        ["l.status as lemma_status", "l.depth", "l.origin"]
        + [f"l.lemma_{u}" for u in UPOS_COLS]
        + [f"l.infl_{p}" for p in PENN_COLS]
    )
    lemma_cols_sql = ", ".join(lemma_cols)

    if has_syn and has_lem:
        cur.execute(f"""
            CREATE TABLE all_words AS
            SELECT w.word,
                   s.wordhoard_synonyms AS synonyms_wordhoard,
                   {lemma_cols_sql}
            FROM (SELECT word FROM synonyms UNION SELECT word FROM lemmas) w
            LEFT JOIN synonyms s USING (word)
            LEFT JOIN lemmas l USING (word)
        """)
    elif has_syn:
        cur.execute("""
            CREATE TABLE all_words AS
            SELECT word, wordhoard_synonyms AS synonyms_wordhoard FROM synonyms
        """)
    else:
        cur.execute(f"""
            CREATE TABLE all_words AS
            SELECT word, status as lemma_status, depth, origin,
                   {", ".join(f"lemma_{u}" for u in UPOS_COLS)},
                   {", ".join(f"infl_{p}" for p in PENN_COLS)}
            FROM lemmas
        """)

    count = cur.execute("SELECT COUNT(*) FROM all_words").fetchone()[0]
    print(f"Created all_words table with {count} rows")

    if not (has_syn and has_lem):
        conn.commit()
        conn.close()
        return

    cur.execute("CREATE UNIQUE INDEX idx_all_words_word ON all_words(word)")
    cur.execute("ALTER TABLE all_words ADD COLUMN synonyms_inflected TEXT")
    cur.execute("ALTER TABLE all_words ADD COLUMN synonyms TEXT")
    conn.commit()

    # Preload caches
    syn_cache = {}
    for w, syns in cur.execute(
        "SELECT word, wordhoard_synonyms FROM synonyms "
        "WHERE wordhoard_status='completed' AND wordhoard_synonyms IS NOT NULL"
    ):
        syn_cache[w] = _split(syns)

    lemma_keys = [f"lemma_{u}" for u in UPOS_COLS] + [f"infl_{p}" for p in PENN_COLS]
    lemma_cols_sql = ", ".join(["word"] + lemma_keys)
    lemma_cache = {}
    for row in cur.execute(f"SELECT {lemma_cols_sql} FROM lemmas WHERE status='completed'"):
        lemma_cache[row[0]] = dict(zip(lemma_keys, row[1:]))

    words = sorted(lemma_cache.keys())
    total = len(words)
    print(f"Computing inflected synonyms for {total} words…\n")
    start = time.time()

    try:
        for i, word in enumerate(words, 1):
            infl_result = _compute_inflected_synonyms(word, lemma_cache, syn_cache)
            wh_syns = set(syn_cache.get(word, []))
            infl_syns = set(_split(infl_result)) if infl_result else set()

            combined = sorted(wh_syns | infl_syns)
            combined_str = ",".join(combined) if combined else None

            cur.execute(
                "UPDATE all_words SET synonyms_inflected = ?, synonyms = ? WHERE word = ?",
                (infl_result, combined_str, word),
            )

            if i % PROGRESS_INTERVAL == 0 or i == total:
                conn.commit()
                elapsed = time.time() - start
                rate = i / elapsed
                eta = (total - i) / rate
                pct = 100 * i / total
                bar = "█" * int(pct // 5) + "░" * (20 - int(pct // 5))
                m, s = divmod(int(eta), 60)
                print(f"\r  {bar} {pct:5.1f}%  {rate:.0f}w/s  ETA {m}m{s:02d}s  [{word}]" + " " * 10, end="", flush=True)

    except KeyboardInterrupt:
        conn.commit()
        print(f"\nStopped at word #{i}.")
        conn.close()
        return

    conn.commit()
    elapsed = time.time() - start
    n = cur.execute("SELECT COUNT(*) FROM all_words WHERE synonyms IS NOT NULL").fetchone()[0]
    print(f"\n  Done — {total} words in {elapsed:.1f}s, {n} have synonyms")
    conn.close()


def main():
    if BUILD_SYNONYMS:
        run_script("build_synonym_cache.py")

    if BUILD_LEMMAS:
        run_script("build_lemma_cache.py")

    if BUILD_JOIN:
        print(f"\n{'='*50}")
        print("Building all_words join table + inflected synonyms")
        print(f"{'='*50}\n")
        build_all_words()

    print(f"\nDone. Database: {DB_PATH}")


if __name__ == "__main__":
    main()
