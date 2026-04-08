"""
SQLite synonym cache — shared by CLI (synonyms.py), Flask (word_cache.py), and build tooling.

DB lives at <repo>/text/synonym_cache.db (same path as build_synonym_cache.py).
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

TEXT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = TEXT_DIR / "synonym_cache.db"

UPOS_COLS = ("ADJ", "ADV", "NOUN", "PROPN", "VERB", "AUX")
PENN_COLS = (
    "JJ", "JJR", "JJS", "RB", "RBR", "RBS",
    "NN", "NNS", "NNP", "NNPS",
    "VB", "VBD", "VBG", "VBN", "VBP", "VBZ", "MD",
)


def _db_path(explicit: Path | str | None) -> Path:
    if explicit is None:
        return DEFAULT_DB_PATH
    return Path(explicit)


def _split(val: str | None) -> list[str]:
    if not val:
        return []
    return [s.strip() for s in val.split(",") if s.strip()]


def synonyms_api_response(
    word: str,
    db_path: Path | str | None = None,
    wordhoard_only: bool = False,
    lemmatize: bool = False,
    inflect: bool = False,
    misspellings: bool = False,
    max_depth: int | None = None
) -> dict:
    """
    JSON body: { "word": <str>, "pos": null, "synonyms": [<str>, ...] }
    plus optional "lemmatize" and "inflections" dicts.

    Uses all_words table
    """
    path = _db_path(db_path)
    result: dict = {"word": word, "pos": None, "synonyms": []}

    if not path.exists():
        print(f"Database file does not exist: {path}")
        return result

    w = word.strip().lower()
    conn = sqlite3.connect(path)

    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM all_words WHERE word = ?", (w,))
        row = cur.fetchone()
        if not row:
            error = f"Word not found in words database: {w}"
            result["error"] = error
            print(error)
            return result

        cols = [desc[0] for desc in cur.description]
        rec = dict(zip(cols, row))

        if max_depth is not None:
            depth = rec.get("depth")
            if depth is not None and depth > max_depth:
                return result

        if wordhoard_only:
            result["synonyms"] = _split(rec.get("synonyms_wordhoard"))
        else:
            result["synonyms"] = _split(rec.get("synonyms"))

        if lemmatize:
            result["lemmas"] = {
                u: _split(rec.get(f"lemma_{u}")) for u in UPOS_COLS
                if rec.get(f"lemma_{u}")
            }

        if inflect:
            result["inflections"] = {
                p: _split(rec.get(f"infl_{p}")) for p in PENN_COLS
                if rec.get(f"infl_{p}")
            }

        if misspellings:
            result["misspellings"] = _split(rec.get("misspellings")) or []

        return result
    finally:
        conn.close()
