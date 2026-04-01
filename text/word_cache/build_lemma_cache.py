#!/usr/bin/env python3
"""
Build lemma/inflection cache database from wordlist using LemmInflect.

Usage:
    python build_lemma_cache.py

The script can be stopped (Ctrl+C) and restarted — it will resume from where it left off.
"""

import sqlite3
import sys
import time
from pathlib import Path

from lemminflect import getAllLemmas, getAllLemmasOOV, getAllInflections, getAllInflectionsOOV

from lookup import DEFAULT_DB_PATH as DB_PATH, TEXT_DIR

WORDLIST_DIR = TEXT_DIR / "wordlist"
SCOWL_SCRIPT = WORDLIST_DIR / "scowl"
SCOWL_DB = WORDLIST_DIR / "scowl.db"

"""
Whether to use lemmatization rules to expand the list of lemmas.
This means that we will include words that may not be real words,
using rules such as "running" -> "run" or "runnering" -> "runner".

If true, we also use rules for inflections, meaning we may incorrectly
include words that are not real words, using rules such as "runner" -> "runnering".
"""
EXPAND_WITH_RULES = True

"""
This is how many times we will recursively expand the list of lemmas and inflections.
At each step, we add newly created words to the list of words in the table.
We recursively expand in order to get words that have multiple inflections,
such as "run" -> "running" -> "runnings" (a plural of the noun form of running - NNS)
"""
MAX_INFLECTION_RECURSION_DEPTH = 3

"""
How often to print progress.
"""
PROGRESS_INTERVAL = 500


"""
https://lemminflect.readthedocs.io/en/latest/tags/

upos = 'ADJ'
* JJ      Adjective
* JJR     Adjective, comparative
* JJS     Adjective, superlative

upos = 'ADV'
* RB      Adverb
* RBR     Adverb, comparative
* RBS     Adverb, superlative

upos = 'NOUN'
* NN      Noun, singular or mass
* NNS     Noun, plural
*
upos = 'PROPN'
* NNP     Proper noun, singular or mass
* NNPS    Proper noun, plural

upos = 'VERB', 'AUX'
* VB      Verb, base form
* VBD     Verb, past tense
* VBG     Verb, gerund or present participle
* VBN     Verb, past participle
* VBP     Verb, non-3rd person singular present
* VBZ     Verb, 3rd person singular present
* MD      Modal
"""

UPOS_COLS = ("ADJ", "ADV", "NOUN", "PROPN", "VERB", "AUX")
PENN_COLS = (
    "JJ", "JJR", "JJS",
    "RB", "RBR", "RBS",
    "NN", "NNS",
    "NNP", "NNPS",
    "VB", "VBD", "VBG", "VBN", "VBP", "VBZ",
    "MD",
)


def init_database():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    lemma_cols = ", ".join(f"lemma_{u} TEXT" for u in UPOS_COLS)
    infl_cols = ", ".join(f"infl_{p} TEXT" for p in PENN_COLS)

    cur.execute(f'''
        CREATE TABLE IF NOT EXISTS lemmas (
            word TEXT PRIMARY KEY,
            status TEXT DEFAULT 'pending',
            depth INTEGER DEFAULT 0,
            origin TEXT DEFAULT 'scowl',
            {lemma_cols},
            {infl_cols}
        )
    ''')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_lemma_status ON lemmas(status)')
    conn.commit()
    return conn


def load_wordlist():
    import subprocess

    if not SCOWL_SCRIPT.exists():
        print(f"Error: scowl script not found at {SCOWL_SCRIPT}")
        sys.exit(1)
    if not SCOWL_DB.exists():
        print(f"Error: scowl.db not found at {SCOWL_DB}")
        sys.exit(1)

    result = subprocess.run(
        [str(SCOWL_SCRIPT), "word-list", str(SCOWL_DB)],
        cwd=str(WORDLIST_DIR),
        capture_output=True, text=True, check=True,
    )
    words = sorted({
        w for line in result.stdout.splitlines()
        if (w := line.strip().lower()) and w.isalpha()
    })
    print(f"Loaded {len(words)} words from scowl")
    return words


def populate(conn, words):
    cur = conn.cursor()
    cur.executemany(
        "INSERT OR IGNORE INTO lemmas (word, status, origin) VALUES (?, 'pending', 'scowl')",
        [(w,) for w in words],
    )
    conn.commit()

    cur.execute("SELECT COUNT(*) FROM lemmas WHERE status='pending'")
    pending = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM lemmas WHERE status='completed'")
    completed = cur.fetchone()[0]
    print(f"Pending: {pending}  Completed: {completed}")
    return pending


def _flatten_values(d):
    """Collect all individual words from a dict of tag → tuple."""
    words = set()
    for forms in d.values():
        for f in forms:
            w = f.strip().lower()
            if w and w.isalpha():
                words.add(w)
    return words


def process(conn):
    """Returns (dict_words, rule_words) — sets of all words seen from each source."""
    cur = conn.cursor()
    cur.execute("SELECT word FROM lemmas WHERE status='pending' ORDER BY word")
    pending = [r[0] for r in cur.fetchall()]
    if not pending:
        print("Nothing to process.")
        return set(), set()

    total = len(pending)
    print(f"Processing {total} words…  (Ctrl+C to stop)\n")

    set_clause = ", ".join(
        [f"lemma_{u} = ?" for u in UPOS_COLS]
        + [f"infl_{p} = ?" for p in PENN_COLS]
        + ["status = 'completed'"]
    )
    update_sql = f"UPDATE lemmas SET {set_clause} WHERE word = ?"

    all_dict_words = set()
    all_rule_words = set()

    start = time.time()
    try:
        for i, word in enumerate(pending, 1):

            # Get lemmas
            lemmas = getAllLemmas(word)

            if EXPAND_WITH_RULES:
                for upos in UPOS_COLS:
                    oov_lem = getAllLemmasOOV(word, upos)
                    for tag, forms in oov_lem.items():
                        if tag not in lemmas:
                            lemmas[tag] = forms

            # Get inflections
            dict_infl = getAllInflections(word)

            all_dict_words |= _flatten_values(lemmas)
            all_dict_words |= _flatten_values(dict_infl)

            inflections = dict(dict_infl)

            if EXPAND_WITH_RULES:
                for upos in UPOS_COLS:
                    oov = getAllInflectionsOOV(word, upos)
                    all_rule_words |= _flatten_values(oov)
                    for tag, forms in oov.items():
                        if tag not in inflections:
                            inflections[tag] = forms

            vals = (
                [",".join(lemmas.get(u, ())) or None for u in UPOS_COLS]
                + [",".join(inflections.get(p, ())) or None for p in PENN_COLS]
                + [word]
            )
            cur.execute(update_sql, vals)

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
        return all_dict_words, all_rule_words

    conn.commit()
    elapsed = time.time() - start
    print(f"\n  Done — {total} words in {elapsed:.1f}s ({total/elapsed:.0f} w/s)")
    return all_dict_words, all_rule_words


def discover_new_words(conn, depth, dict_words, rule_words):
    """Insert newly seen words. Origin is 'dict' if the word appeared in
    dictionary results, 'rule' if it only appeared in OOV/rule results."""
    cur = conn.cursor()
    cur.execute("SELECT word FROM lemmas")
    existing = {r[0] for r in cur.fetchall()}

    all_new = (dict_words | rule_words) - existing
    if not all_new:
        return 0

    rows = []
    for w in sorted(all_new):
        origin = "dict" if w in dict_words else "rule"
        rows.append((w, depth, origin))

    cur.executemany(
        "INSERT OR IGNORE INTO lemmas (word, status, depth, origin) VALUES (?, 'pending', ?, ?)",
        rows,
    )
    conn.commit()

    n_dict = sum(1 for _, _, o in rows if o == "dict")
    n_rule = sum(1 for _, _, o in rows if o == "rule")
    print(f"Discovered {len(rows)} new words at depth {depth} (dict: {n_dict}, rule: {n_rule})")
    return len(rows)


def main():
    print(f"Lemma Cache Builder  →  {DB_PATH}\n")
    conn = init_database()
    words = load_wordlist()
    populate(conn, words)

    pass_num = 1
    while True:
        print(f"\n--- Pass {pass_num} ---")
        dict_words, rule_words = process(conn)
        if pass_num >= MAX_INFLECTION_RECURSION_DEPTH:
            print(f"Reached max depth ({MAX_INFLECTION_RECURSION_DEPTH})")
            break
        new = discover_new_words(conn, pass_num, dict_words, rule_words)
        if new == 0:
            break
        pass_num += 1

    conn.close()


if __name__ == "__main__":
    main()
