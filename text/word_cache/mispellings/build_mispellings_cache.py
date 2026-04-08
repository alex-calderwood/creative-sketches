#!/usr/bin/env python3
"""
Build misspellings table in the word cache DB from misspellings.txt.

Runs create_mispellings_file.py if misspellings.txt doesn't exist yet.

Table schema:
    misspellings(word TEXT PRIMARY KEY, misspellings TEXT)
    where misspellings is a comma-delimited list.
"""

import sqlite3
import subprocess
import sys
from collections import defaultdict
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from lookup import DEFAULT_DB_PATH as DB_PATH

MISSPELLINGS_DIR = Path(__file__).resolve().parent
MISSPELLINGS_TXT = MISSPELLINGS_DIR / "misspellings.txt"
CREATE_SCRIPT = MISSPELLINGS_DIR / "create_mispellings_file.py"


def ensure_misspellings_txt():
    if MISSPELLINGS_TXT.exists():
        return
    print(f"misspellings.txt not found, running {CREATE_SCRIPT.name}…")
    subprocess.run(
        [sys.executable, str(CREATE_SCRIPT), "-o", str(MISSPELLINGS_TXT)],
        check=True,
    )


def load_misspellings() -> dict[str, list[str]]:
    """Parse misspellings.txt (correction=>misspelling) into {word: [misspellings]}."""
    word_to_missp = defaultdict(set)
    with open(MISSPELLINGS_TXT, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or "=>" not in line:
                continue
            correction, misspelling = line.split("=>", 1)
            correction = correction.strip()
            misspelling = misspelling.strip()
            if correction and misspelling:
                word_to_missp[correction].add(misspelling)
    return {w: sorted(ms) for w, ms in word_to_missp.items()}


def build_table():
    ensure_misspellings_txt()
    mapping = load_misspellings()

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute("DROP TABLE IF EXISTS misspellings")
    cur.execute("""
        CREATE TABLE misspellings (
            word TEXT PRIMARY KEY,
            misspellings TEXT
        )
    """)
    cur.executemany(
        "INSERT INTO misspellings (word, misspellings) VALUES (?, ?)",
        [(w, ",".join(ms)) for w, ms in sorted(mapping.items())],
    )
    conn.commit()
    count = cur.execute("SELECT COUNT(*) FROM misspellings").fetchone()[0]
    print(f"Created misspellings table with {count} rows")
    conn.close()


def main():
    print(f"Misspellings Cache Builder  →  {DB_PATH}\n")
    build_table()


if __name__ == "__main__":
    main()
