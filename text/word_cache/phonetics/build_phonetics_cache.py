#!/usr/bin/env python3
"""
Build the `pronunciations` table in the word cache DB from cmudict.txt.

Runs create_pronunciation_file.py if cmudict.txt doesn't exist yet.

One row per pronunciation variant (a word like "read" has two), so that
homophones and rhymes that only exist under an alternate pronunciation are
still found.

Table schema:
    pronunciations(
        word           TEXT,   -- lowercase, may repeat across variants
        variant        INT,    -- 0-based variant index for this word
        phonemes       TEXT,   -- "HH AH0 L OW1"  (ARPAbet + stress)
        homophone_key  TEXT,   -- stress stripped: "HH AH L OW"
        rhyme_key      TEXT,   -- last stressed vowel -> end: "OW1"  (perfect rhyme)
        near_rhyme_key TEXT,   -- vowels of the rhyme part: "OW"     (assonance / slant)
        syllables      INT
    )

Lookups (see phonetic_lookup.py) work by matching keys:
    homophones   -> same homophone_key
    rhymes       -> same rhyme_key
    near_rhymes  -> same near_rhyme_key
"""

import sqlite3
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lookup import DEFAULT_DB_PATH as DB_PATH  # noqa: E402

PHONETICS_DIR = Path(__file__).resolve().parent
CMUDICT_TXT = PHONETICS_DIR / "cmudict.txt"
CREATE_SCRIPT = PHONETICS_DIR / "create_pronunciation_file.py"


# ── ARPAbet key derivation ──────────────────────────────────────────────────
# In CMU/ARPAbet, vowel phones (and only vowels) carry a trailing stress digit:
#   0 = unstressed, 1 = primary stress, 2 = secondary stress.

def _is_vowel(ph: str) -> bool:
    return ph[-1:].isdigit()


def _strip_stress(ph: str) -> str:
    return ph[:-1] if _is_vowel(ph) else ph


def _rhyme_start(phones: list[str]) -> int:
    """Index of the last primary/secondary-stressed vowel (fallback: last vowel)."""
    idx = None
    for i, ph in enumerate(phones):
        if ph[-1:] in ("1", "2"):
            idx = i
    if idx is None:
        for i, ph in enumerate(phones):
            if _is_vowel(ph):
                idx = i
    return 0 if idx is None else idx


def derive_keys(phones: list[str]) -> dict:
    """Return phonemes/homophone_key/rhyme_key/near_rhyme_key/syllables."""
    start = _rhyme_start(phones)
    rhyme_tail = phones[start:]
    return {
        "phonemes": " ".join(phones),
        "homophone_key": " ".join(_strip_stress(p) for p in phones),
        "rhyme_key": " ".join(rhyme_tail),
        "near_rhyme_key": " ".join(_strip_stress(p) for p in rhyme_tail if _is_vowel(p)),
        "syllables": sum(1 for p in phones if _is_vowel(p)),
    }


# ── Source loading ──────────────────────────────────────────────────────────

def ensure_cmudict_txt() -> None:
    if CMUDICT_TXT.exists():
        return
    print(f"cmudict.txt not found, running {CREATE_SCRIPT.name}…")
    subprocess.run(
        [sys.executable, str(CREATE_SCRIPT), "-o", str(CMUDICT_TXT)],
        check=True,
    )


def load_rows() -> list[tuple]:
    """Parse cmudict.txt into insertable rows with per-word variant indices."""
    variant_counter: dict[str, int] = {}
    rows: list[tuple] = []
    with open(CMUDICT_TXT, encoding="utf-8") as f:
        for line in f:
            parts = line.split()
            if len(parts) < 2:
                continue
            word, phones = parts[0], parts[1:]
            keys = derive_keys(phones)
            variant = variant_counter.get(word, 0)
            variant_counter[word] = variant + 1
            rows.append((
                word, variant,
                keys["phonemes"], keys["homophone_key"],
                keys["rhyme_key"], keys["near_rhyme_key"], keys["syllables"],
            ))
    return rows


# ── Build ───────────────────────────────────────────────────────────────────

def build_table() -> None:
    ensure_cmudict_txt()
    rows = load_rows()

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("DROP TABLE IF EXISTS pronunciations")
    cur.execute("""
        CREATE TABLE pronunciations (
            word           TEXT,
            variant        INT,
            phonemes       TEXT,
            homophone_key  TEXT,
            rhyme_key      TEXT,
            near_rhyme_key TEXT,
            syllables      INT
        )
    """)
    cur.executemany(
        """INSERT INTO pronunciations
           (word, variant, phonemes, homophone_key, rhyme_key, near_rhyme_key, syllables)
           VALUES (?, ?, ?, ?, ?, ?, ?)""",
        rows,
    )
    # Indexes: word for "keys of this word", the three keys for "words sharing key".
    cur.execute("CREATE INDEX idx_pron_word ON pronunciations(word)")
    cur.execute("CREATE INDEX idx_pron_homophone ON pronunciations(homophone_key)")
    cur.execute("CREATE INDEX idx_pron_rhyme ON pronunciations(rhyme_key)")
    cur.execute("CREATE INDEX idx_pron_near ON pronunciations(near_rhyme_key)")
    conn.commit()

    count = cur.execute("SELECT COUNT(*) FROM pronunciations").fetchone()[0]
    words = cur.execute("SELECT COUNT(DISTINCT word) FROM pronunciations").fetchone()[0]
    print(f"Created pronunciations table with {count} rows ({words} distinct words)")
    conn.close()


def main() -> None:
    print(f"Phonetics Cache Builder  →  {DB_PATH}\n")
    build_table()


if __name__ == "__main__":
    main()
