"""
Phonetic lookups against the `pronunciations` table — shared by the CLI below,
the Flask server (word_cache.py), and any other tooling.

DB lives at <repo>/text/synonym_cache.db (same path as the rest of the cache).

Three relations, all built from the CMU Pronouncing Dictionary:
    homophones(word)  -> sound exactly the same   (to / too / two)
    rhymes(word)      -> perfect rhyme            (running / cunning)
    near_rhymes(word) -> slant rhyme by assonance (matching vowel run; excludes
                         perfect rhymes so you get *additional* candidates)
"""

from __future__ import annotations

import sqlite3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lookup import DEFAULT_DB_PATH  # noqa: E402


def _connect(db_path: Path | str | None) -> sqlite3.Connection | None:
    path = Path(db_path) if db_path is not None else DEFAULT_DB_PATH
    if not path.exists():
        print(f"Database file does not exist: {path}")
        return None
    return sqlite3.connect(path)


def _keys(cur: sqlite3.Cursor, column: str, word: str) -> list[str]:
    rows = cur.execute(
        f"SELECT DISTINCT {column} FROM pronunciations WHERE word = ?", (word,)
    ).fetchall()
    return [r[0] for r in rows if r[0]]


def _match(cur: sqlite3.Cursor, column: str, keys: list[str], word: str) -> list[str]:
    if not keys:
        return []
    qs = ",".join("?" * len(keys))
    rows = cur.execute(
        f"""SELECT DISTINCT word FROM pronunciations
            WHERE {column} IN ({qs}) AND word != ?
            ORDER BY word""",
        (*keys, word),
    ).fetchall()
    return [r[0] for r in rows]


def _lookup(word: str, column: str, db_path) -> list[str]:
    conn = _connect(db_path)
    if conn is None:
        return []
    try:
        cur = conn.cursor()
        w = word.strip().lower()
        return _match(cur, column, _keys(cur, column, w), w)
    finally:
        conn.close()


def pronunciations(word: str, db_path=None) -> list[str]:
    """Every ARPAbet pronunciation on record for `word`."""
    conn = _connect(db_path)
    if conn is None:
        return []
    try:
        rows = conn.execute(
            "SELECT phonemes FROM pronunciations WHERE word = ? ORDER BY variant",
            (word.strip().lower(),),
        ).fetchall()
        return [r[0] for r in rows]
    finally:
        conn.close()


def homophones(word: str, db_path=None) -> list[str]:
    return _lookup(word, "homophone_key", db_path)


def rhymes(word: str, db_path=None) -> list[str]:
    return _lookup(word, "rhyme_key", db_path)


def near_rhymes(word: str, db_path=None) -> list[str]:
    """Slant rhymes (shared vowel run), excluding exact rhymes."""
    near = set(_lookup(word, "near_rhyme_key", db_path))
    return sorted(near - set(rhymes(word, db_path)))


def phonetics_api_response(word: str, db_path=None) -> dict:
    """JSON body used by the Flask server: word + all four relations."""
    return {
        "word": word,
        "pronunciations": pronunciations(word, db_path),
        "homophones": homophones(word, db_path),
        "rhymes": rhymes(word, db_path),
        "near_rhymes": near_rhymes(word, db_path),
    }


_COMMANDS = {
    "pronounce": pronunciations,
    "homophones": homophones,
    "rhymes": rhymes,
    "near-rhymes": near_rhymes,
    "near_rhymes": near_rhymes,
}


def main() -> None:
    if len(sys.argv) < 3 or sys.argv[1] not in _COMMANDS:
        cmds = "|".join(k for k in _COMMANDS if k != "near_rhymes")
        print(f"Usage: python phonetic_lookup.py <{cmds}> <word>")
        sys.exit(1)
    result = _COMMANDS[sys.argv[1]](sys.argv[2])
    for item in result:
        print(item)


if __name__ == "__main__":
    main()
