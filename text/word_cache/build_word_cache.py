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

from tqdm import tqdm

from lookup import DEFAULT_DB_PATH as DB_PATH

BUILD_SYNONYMS      = False
BUILD_LEMMAS        = False
BUILD_MISSPELLINGS  = False
BUILD_JOIN          = True

ALL_WORDS_TABLE = "all_words_2"
LEMMAS_TABLE = "lemmas"
    SYNONYMS_TABLE = "synonyms"
MISSPELLINGS_TABLE = "misspellings"

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
                infl_set = lemma_row.get(f"infl_{ptag}")
                if infl_set and word in infl_set:
                    matching_tags.append((lemma, ptag))

        for lemma, ptag in matching_tags:
            for syn in syn_cache.get(lemma, []):
                syn_row = lemma_cache.get(syn.strip().lower())
                if syn_row:
                    infl_set = syn_row.get(f"infl_{ptag}")
                    if infl_set:
                        inflected_syns.update(infl_set)

    inflected_syns.discard(word)
    return ",".join(sorted(inflected_syns)) if inflected_syns else None


def build_all_words():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    tables = {r[0] for r in cur.execute("SELECT name FROM sqlite_master WHERE type='table'")}

    has_syn = SYNONYMS_TABLE in tables
    has_lem = LEMMAS_TABLE in tables
    has_mis = MISSPELLINGS_TABLE in tables

    if not has_syn and not has_lem:
        print(f"No source tables found, skipping {ALL_WORDS_TABLE}")
        conn.close()
        return

    cur.execute(f"DROP TABLE IF EXISTS {ALL_WORDS_TABLE}")

    lemma_cols = (
        ["l.status as lemma_status", "l.depth", "l.origin"]
        + [f"l.lemma_{u}" for u in UPOS_COLS]
        + [f"l.infl_{p}" for p in PENN_COLS]
    )
    lemma_cols_sql = ", ".join(lemma_cols)

    mis_select = ", m.misspellings" if has_mis else ""
    mis_join = f"LEFT JOIN {MISSPELLINGS_TABLE} m USING (word)" if has_mis else ""
    mis_union = f" UNION SELECT word FROM {MISSPELLINGS_TABLE}" if has_mis else ""

    if has_syn and has_lem:
        cur.execute(f"""
            CREATE TABLE {ALL_WORDS_TABLE} AS
            SELECT w.word,
                   s.wordhoard_synonyms AS synonyms_wordhoard,
                   {lemma_cols_sql}
                   {mis_select}
            FROM (SELECT word FROM {SYNONYMS_TABLE} UNION SELECT word FROM {LEMMAS_TABLE}{mis_union}) w
            LEFT JOIN {SYNONYMS_TABLE} s USING (word)
            LEFT JOIN {LEMMAS_TABLE} l USING (word)
            {mis_join}
        """)
    elif has_syn:
        cur.execute(f"""
            CREATE TABLE {ALL_WORDS_TABLE} AS
            SELECT s.word, wordhoard_synonyms AS synonyms_wordhoard
                   {mis_select}
            FROM {SYNONYMS_TABLE} s
            {mis_join}
        """)
    else:
        cur.execute(f"""
            CREATE TABLE {ALL_WORDS_TABLE} AS
            SELECT l.word, status as lemma_status, depth, origin,
                   {", ".join(f"lemma_{u}" for u in UPOS_COLS)},
                   {", ".join(f"infl_{p}" for p in PENN_COLS)}
                   {mis_select}
            FROM {LEMMAS_TABLE} l
            {mis_join}
        """)

    count = cur.execute(f"SELECT COUNT(*) FROM {ALL_WORDS_TABLE}").fetchone()[0]
    print(f"Created {ALL_WORDS_TABLE} table with {count} rows")

    if not (has_syn and has_lem):
        conn.commit()
        conn.close()
        return

    print(f"Creating index on {ALL_WORDS_TABLE}(word)…")
    idx_word = f"idx_{ALL_WORDS_TABLE}_word"
    cur.execute(f"DROP INDEX IF EXISTS {idx_word}")
    cur.execute(f"CREATE UNIQUE INDEX {idx_word} ON {ALL_WORDS_TABLE}(word)")
    print("Adding synonym columns…")
    cur.execute(f"ALTER TABLE {ALL_WORDS_TABLE} ADD COLUMN synonyms_inflected TEXT")
    cur.execute(f"ALTER TABLE {ALL_WORDS_TABLE} ADD COLUMN synonyms TEXT")
    conn.commit()
    print("Loading synonym cache…")

    # Preload caches
    syn_cache = {}
    for w, syns in cur.execute(
        f"SELECT word, wordhoard_synonyms FROM {SYNONYMS_TABLE} "
        "WHERE wordhoard_status='completed' AND wordhoard_synonyms IS NOT NULL"
    ):
        syn_cache[w] = _split(syns)
    print(f"  {len(syn_cache)} synonym entries loaded")

    lemma_keys = [f"lemma_{u}" for u in UPOS_COLS] + [f"infl_{p}" for p in PENN_COLS]
    infl_key_set = {f"infl_{p}" for p in PENN_COLS}
    lemma_cols_sql = ", ".join(["word"] + lemma_keys)
    lemma_total = cur.execute(
        f"SELECT COUNT(*) FROM {LEMMAS_TABLE} WHERE status='completed'"
    ).fetchone()[0]
    lemma_cache = {}
    rows = cur.execute(
        f"SELECT {lemma_cols_sql} FROM {LEMMAS_TABLE} WHERE status='completed'"
    )
    for row in tqdm(rows, desc="Loading lemma cache", total=lemma_total, unit="w", colour="cyan"):
        d = {}
        for k, v in zip(lemma_keys, row[1:]):
            if k in infl_key_set and v:
                d[k] = frozenset(v.split(","))
            else:
                d[k] = v
        lemma_cache[row[0]] = d

    words = sorted(lemma_cache.keys())
    total = len(words)

    try:
        with tqdm(words, desc="Inflected synonyms", unit="w", colour="cyan") as pbar:
            for i, word in enumerate(pbar, 1):
                infl_result = _compute_inflected_synonyms(word, lemma_cache, syn_cache)
                wh_syns = set(syn_cache.get(word, []))
                infl_syns = set(_split(infl_result)) if infl_result else set()

                combined = sorted(wh_syns | infl_syns)
                combined_str = ",".join(combined) if combined else None

                cur.execute(
                    f"UPDATE {ALL_WORDS_TABLE} SET synonyms_inflected = ?, synonyms = ? WHERE word = ?",
                    (infl_result, combined_str, word),
                )

                if i % PROGRESS_INTERVAL == 0:
                    conn.commit()

    except KeyboardInterrupt:
        conn.commit()
        print(f"\nStopped at word #{i}.")
        conn.close()
        return

    conn.commit()
    n = cur.execute(
        f"SELECT COUNT(*) FROM {ALL_WORDS_TABLE} WHERE synonyms IS NOT NULL"
    ).fetchone()[0]
    print(f"  {n} of {total} words have synonyms")
    conn.close()


def main():
    if BUILD_SYNONYMS:
        run_script("build_synonym_cache.py")

    if BUILD_LEMMAS:
        run_script("build_lemma_cache.py")

    if BUILD_MISSPELLINGS:
        run_script("mispellings/build_mispellings_cache.py")

    # TODO there is a problem using the inflectoins to create synonyms - we should only use the non rule based ones for that if they exist
    # because sometimes there are two of the same inflectoin for a given word
    
    if BUILD_JOIN:
        print(f"\n{'='*50}")
        print(f"Building {ALL_WORDS_TABLE} join table + inflected synonyms")
        print(f"{'='*50}\n")
        build_all_words()

    print(f"\nDone. Database: {DB_PATH}")


if __name__ == "__main__":
    main()
