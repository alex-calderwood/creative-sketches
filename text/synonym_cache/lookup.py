"""
SQLite synonym cache — shared by CLI (synonyms.py), Flask (synonyms_cache.py), and build tooling.

DB lives at <repo>/text/synonym_cache.db (same path as build_synonym_cache.py).
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

TEXT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DB_PATH = TEXT_DIR / "synonym_cache.db"


def _db_path(explicit: Path | str | None) -> Path:
    if explicit is None:
        return DEFAULT_DB_PATH
    return Path(explicit)


def fetch_word_record(word: str, db_path: Path | str | None = None):
    """
    Return (wordhoard_synonyms, wordhoard_status, wordhoard_error_message) or None if no row.
    Returns None without opening DB if path does not exist (caller treats as missing DB).
    """
    path = _db_path(db_path)
    if not path.exists():
        return None
    w = word.strip().lower()
    conn = sqlite3.connect(path)
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT wordhoard_synonyms, wordhoard_status, wordhoard_error_message "
            "FROM words WHERE word = ?",
            (w,),
        )
        return cur.fetchone()
    finally:
        conn.close()


def synonyms_api_response(word: str, db_path: Path | str | None = None) -> dict:
    """
    JSON body matching the wordhoard GET /synonyms handler:
    { "word": <str>, "pos": null, "synonyms": [<str>, ...] }
    """
    path = _db_path(db_path)
    synonyms: list[str] = []
    if path.exists():
        row = fetch_word_record(word, path)
        if row:
            blob, status, _err = row
            if status == "completed" and blob:
                synonyms = [s.strip() for s in blob.split(",") if s.strip()]
    return {"word": word, "pos": None, "synonyms": synonyms}
