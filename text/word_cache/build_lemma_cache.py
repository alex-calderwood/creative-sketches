#!/usr/bin/env python3
"""
Build lemma/inflection cache database from wordlist using LemmInflect.

Usage:
    python build_lemma_cache.py

The script can be stopped (Ctrl+C) and restarted — it will resume from where it left off.
"""

import json
import sqlite3
from collections import Counter
import subprocess
import sys
import time
import urllib.request
from pathlib import Path


from lemminflect import getAllLemmas, getAllLemmasOOV, getAllInflections, getAllInflectionsOOV

from lookup import DEFAULT_DB_PATH as DB_PATH, TEXT_DIR

LEMMAS_TABLE = "lemmas_2"

# "scowl" — local SCOWL word list; "websters" — Webster's JSON (dict or alpha-array list)
WORDLIST_SOURCE = "websters"

WORDLIST_DIR = TEXT_DIR / "wordlist"
SCOWL_SCRIPT = WORDLIST_DIR / "scowl"
SCOWL_DB = WORDLIST_DIR / "scowl.db"

# WEBSTERS_DICTIONARY_URL = "https://github.com/matthewreagan/WebstersEnglishDictionary/raw/refs/heads/master/dictionary.json"
WEBSTERS_DICTIONARY_URL = "dictionary.json"

"""
Whether to use lemmatization rules to expand the list of lemmas.
This means that we will include words that may not be real words,
using rules such as "running" -> "run" or "runnering" -> "runner".

If true, we also use rules for inflections, meaning we may incorrectly
include words that are not real words, using rules such as "runner" -> "runnering".
"""
EXPAND_WITH_RULES = True

"""When False, lemma columns stay NULL and lemma APIs / OOV lemma expansion are skipped."""
FETCH_LEMMAS = True

"""When False, inflection columns stay NULL and inflection APIs / OOV inflection expansion are skipped."""
FETCH_INFLECTIONS = True

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
PROGRESS_INTERVAL = 5000
"""
https://lemminflect.readthedocs.io/en/latest/tags/

upos = Universal Dependencies
others = Penn Treebank https://surdeanu.cs.arizona.edu/mihai/teaching/ista555-fall13/readings/PennTreebankTagset.html

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

    # Enable write-ahead logging for better concurrency (multiple readers/writers)
    # and set synchronous mode to NORMAL for faster write performance at some risk of data loss on crash.
    # cur.execute("PRAGMA journal_mode=WAL")
    # cur.execute("PRAGMA synchronous=NORMAL")

    lemma_cols = ", ".join(f"lemma_{u} TEXT" for u in UPOS_COLS)
    infl_cols = ", ".join(f"infl_{p} TEXT" for p in PENN_COLS)

    cur.execute(f'''
        CREATE TABLE IF NOT EXISTS {LEMMAS_TABLE} (
            word TEXT PRIMARY KEY,
            status TEXT DEFAULT 'pending',
            depth INTEGER DEFAULT 0,
            origin TEXT DEFAULT 'scowl',
            definition TEXT,
            {lemma_cols},
            {infl_cols}
        )
    ''')
    existing_cols = {r[1] for r in cur.execute(f"PRAGMA table_info({LEMMAS_TABLE})")}
    if "definition" not in existing_cols:
        cur.execute(f"ALTER TABLE {LEMMAS_TABLE} ADD COLUMN definition TEXT")
    if "origin_word" not in existing_cols:
        cur.execute(f"ALTER TABLE {LEMMAS_TABLE} ADD COLUMN origin_word TEXT")
    if "origin_tag" not in existing_cols:
        cur.execute(f"ALTER TABLE {LEMMAS_TABLE} ADD COLUMN origin_tag TEXT")
    cur.execute(f"CREATE INDEX IF NOT EXISTS idx_lemma_status ON {LEMMAS_TABLE}(status)")
    conn.commit()
    return conn


def load_wordlist_scowl():
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


def _webster_headword_ok(w: str) -> bool:
    """Allow letters plus hyphen / apostrophe (e.g. anti-federalist, don't)."""
    if not w or not w[0].isalpha():
        return False
    
    # don't let the first or lass characters be -
    if w[0] == '-' or w[-1] == '-':
        return False
    return True


def _webster_definition(v) -> str | None:
    if v is None:
        return None
    s = str(v).strip()
    return s if s else None


def _iter_webster_items(data):
    if isinstance(data, dict):
        yield from data.items()
    elif isinstance(data, list):
        for block in data:
            if isinstance(block, dict):
                yield from block.items()
            else:
                print("Error: Webster's list format expects objects per element", file=sys.stderr)
                sys.exit(1)
    else:
        print("Error: Webster's JSON must be an object or a list of objects", file=sys.stderr)
        sys.exit(1)


def _load_websters_json(path_or_url: str):
    p = Path(path_or_url)
    if p.is_file():
        with open(p, encoding="utf-8") as f:
            return json.load(f)
    if str(path_or_url).startswith("http"):
        req = urllib.request.Request(
            path_or_url,
            headers={"User-Agent": "build_lemma_cache.py (wordlist)"},
        )
        with urllib.request.urlopen(req, timeout=300) as resp:
            return json.load(resp)
    print(f"Error: Webster's source not found: {path_or_url}", file=sys.stderr)
    sys.exit(1)


def load_wordlist_websters(path_or_url: str | None = None) -> list[tuple[str, str | None]]:
    """Load headwords and definitions from Webster's JSON: ``dictionary.json`` /
    ``dictionary_compact.json`` (word → definition object) or ``dictionary_alpha_arrays.json``
    (list of per-letter objects, merged). Duplicate headwords after normalization: last wins.
    """
    src = path_or_url or WEBSTERS_DICTIONARY_URL
    data = _load_websters_json(src)
    by_word: dict[str, str | None] = {}
    for k, v in _iter_webster_items(data):
        w = str(k).strip().lower()
        if not w or not _webster_headword_ok(w):
            continue
        by_word[w] = _webster_definition(v)
    rows = sorted(by_word.items(), key=lambda t: t[0])
    print(f"Loaded {len(rows)} words from Webster's ({src})")
    return rows


def populate(conn, word_rows: list[tuple[str, str | None]], origin: str = "scowl"):
    cur = conn.cursor()
    cur.executemany(
        f"""INSERT OR IGNORE INTO {LEMMAS_TABLE}
            (word, status, origin, definition) VALUES (?, 'pending', ?, ?)""",
        [(w, origin, d) for w, d in word_rows],
    )
    conn.commit()

    cur.execute(f"SELECT COUNT(*) FROM {LEMMAS_TABLE} WHERE status='pending'")
    pending = cur.fetchone()[0]
    cur.execute(f"SELECT COUNT(*) FROM {LEMMAS_TABLE} WHERE status='completed'")
    completed = cur.fetchone()[0]
    print(f"Pending: {pending}  Completed: {completed}")
    return pending


def _oov_forms_excluding_parent(forms, parent_key: str):
    """OOV rule output with the parent string removed (rules often echo the input).

    ``parent_key`` must already be ``parent.strip().lower()``. Reuses ``forms`` if unchanged."""
    out = []
    dropped = False
    for f in forms:
        if f.strip().lower() != parent_key:
            out.append(f)
        else:
            dropped = True
    if not dropped:
        return forms
    return tuple(out)


def _merge_forms_to_parent_tag(
    m: dict[str, tuple[str, str]],
    forms_dict,
    parent: str,
    *,
    skip_same_as_parent: bool = False,
    parent_key: str | None = None,
) -> None:
    """Record child → (parent, tag) for each form; first (parent, tag) wins per child.

    When ``skip_same_as_parent`` is True, pass ``parent_key=parent.strip().lower()`` once per
    word (avoid recomputing inside the per-form loop)."""
    if skip_same_as_parent:
        pk = parent_key if parent_key is not None else parent.strip().lower()
    else:
        pk = None
    for tag, forms in forms_dict.items():
        for f in forms:
            w = f.strip().lower()
            if not w or not w.isalpha():
                continue
            if pk is not None and w == pk:
                continue
            if w not in m:
                m[w] = (parent, tag)


def process(conn):
    """Returns four maps child_word → (parent_word, tag). Tag is UPOS for *lemma*, Penn for *infl*."""
    cur = conn.cursor()
    cur.execute(f"SELECT word FROM {LEMMAS_TABLE} WHERE status='pending' ORDER BY word")
    pending = [r[0] for r in cur.fetchall()]
    if not pending:
        print("Nothing to process.")
        return {}, {}, {}, {}

    total = len(pending)
    print(f"Processing {total} words…  (Ctrl+C to stop)\n")
    print(f"  FETCH_LEMMAS={FETCH_LEMMAS}  FETCH_INFLECTIONS={FETCH_INFLECTIONS}\n")

    set_clause = ", ".join(
        [f"lemma_{u} = ?" for u in UPOS_COLS]
        + [f"infl_{p} = ?" for p in PENN_COLS]
        + ["status = 'completed'"]
    )
    update_sql = f"UPDATE {LEMMAS_TABLE} SET {set_clause} WHERE word = ?"

    dict_lemma_map: dict[str, tuple[str, str]] = {}
    dict_infl_map: dict[str, tuple[str, str]] = {}
    rule_lemma_map: dict[str, tuple[str, str]] = {}
    rule_infl_map: dict[str, tuple[str, str]] = {}

    start = time.time()
    try:
        for i, word in enumerate(pending, 1):
            word_key = word.strip().lower()

            if FETCH_LEMMAS:
                lemmas = getAllLemmas(word)
                _merge_forms_to_parent_tag(dict_lemma_map, lemmas, word)
                if EXPAND_WITH_RULES:
                    for upos in UPOS_COLS:
                        oov_lem = getAllLemmasOOV(word, upos)
                        _merge_forms_to_parent_tag(
                            rule_lemma_map,
                            oov_lem,
                            word,
                            skip_same_as_parent=True,
                            parent_key=word_key,
                        )
                        for tag, forms in oov_lem.items():
                            if tag not in lemmas:
                                forms_f = _oov_forms_excluding_parent(forms, word_key)
                                if forms_f:
                                    lemmas[tag] = forms_f
            else:
                lemmas = {}

            if FETCH_INFLECTIONS:
                dict_infl_src = getAllInflections(word)
                _merge_forms_to_parent_tag(dict_infl_map, dict_infl_src, word)
                inflections = dict(dict_infl_src)
                if EXPAND_WITH_RULES:
                    for upos in UPOS_COLS:
                        oov = getAllInflectionsOOV(word, upos)
                        _merge_forms_to_parent_tag(
                            rule_infl_map,
                            oov,
                            word,
                            skip_same_as_parent=True,
                            parent_key=word_key,
                        )
                        for tag, forms in oov.items():
                            if tag not in inflections:
                                forms_f = _oov_forms_excluding_parent(forms, word_key)
                                if forms_f:
                                    inflections[tag] = forms_f
            else:
                inflections = {}

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
        return dict_lemma_map, dict_infl_map, rule_lemma_map, rule_infl_map

    conn.commit()
    elapsed = time.time() - start
    print(f"\n  Done — {total} words in {elapsed:.1f}s ({total/elapsed:.0f} w/s)")
    return dict_lemma_map, dict_infl_map, rule_lemma_map, rule_infl_map


def _origin_for_word(
    w: str,
    dict_lemma: dict,
    dict_infl: dict,
    rule_lemma: dict,
    rule_infl: dict,
) -> str:
    """Dict sources win over rule (matches former dict vs rule); lemma over inflect."""
    if w in dict_lemma:
        return "dict_lemma"
    if w in dict_infl:
        return "dict_inflect"
    if w in rule_lemma:
        return "rule_lemma"
    return "rule_inflect"


def _origin_word_and_tag_for_discovered(
    w: str,
    dict_lemma: dict,
    dict_infl: dict,
    rule_lemma: dict,
    rule_infl: dict,
) -> tuple[str, str]:
    """(parent_word, lemminflect_tag) for the winning origin tier."""
    if w in dict_lemma:
        return dict_lemma[w]
    if w in dict_infl:
        return dict_infl[w]
    if w in rule_lemma:
        return rule_lemma[w]
    return rule_infl[w]


def discover_new_words(conn, depth, dict_lemma, dict_infl, rule_lemma, rule_infl):
    """Insert newly seen words; origin, origin_word, origin_tag from lemma/inflect maps."""
    cur = conn.cursor()
    cur.execute(f"SELECT word FROM {LEMMAS_TABLE}")
    existing = {r[0] for r in cur.fetchall()}

    all_new = (
        set(dict_lemma) | set(dict_infl) | set(rule_lemma) | set(rule_infl)
    ) - existing
    if not all_new:
        return 0

    rows = []
    for w in sorted(all_new):
        origin = _origin_for_word(w, dict_lemma, dict_infl, rule_lemma, rule_infl)
        ow, ot = _origin_word_and_tag_for_discovered(w, dict_lemma, dict_infl, rule_lemma, rule_infl)
        rows.append((w, depth, origin, ow, ot))

    cur.executemany(
        f"""INSERT OR IGNORE INTO {LEMMAS_TABLE}
            (word, status, depth, origin, origin_word, origin_tag) VALUES (?, 'pending', ?, ?, ?, ?)""",
        rows,
    )
    conn.commit()

    counts = Counter(o for _, _, o, _, _ in rows)
    parts = ", ".join(f"{k}: {counts[k]}" for k in ("dict_lemma", "dict_inflect", "rule_lemma", "rule_inflect"))
    print(f"Discovered {len(rows)} new words at depth {depth} ({parts})")
    return len(rows)


def main():
    print(f"Lemma Cache Builder  →  {DB_PATH}\n")
    conn = init_database()
    if WORDLIST_SOURCE == "websters":
        populate(conn, load_wordlist_websters(), origin="websters")
    else:
        populate(conn, [(w, None) for w in load_wordlist_scowl()], origin="scowl")

    pass_num = 1
    while True:
        print(f"\n--- Pass {pass_num} ---")
        d_lem, d_inf, r_lem, r_inf = process(conn)
        if pass_num >= MAX_INFLECTION_RECURSION_DEPTH:
            print(f"Reached max depth ({MAX_INFLECTION_RECURSION_DEPTH})")
            break
        new = discover_new_words(conn, pass_num, d_lem, d_inf, r_lem, r_inf)
        if new == 0:
            break
        pass_num += 1

    conn.close()


if __name__ == "__main__":
    main()
