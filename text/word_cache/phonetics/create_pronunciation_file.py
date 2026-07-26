#!/usr/bin/env python3
"""
Build a normalized pronunciation file from the CMU Pronouncing Dictionary.

Prefers the offline `cmudict` pip package; falls back to downloading the raw
dictionary from GitHub. Writes one pronunciation per line:

    word ARPABET PHONES WITH STRESS

e.g.

    hello HH AH0 L OW1
    read R EH1 D
    read R IY1 D          # alternate pronunciation -> second line, same word

Words are lowercased (to match the rest of the word cache); phones stay in
canonical uppercase ARPAbet with stress digits on the vowels.

Usage:
    pip install cmudict        # or: pip install requests
    python create_pronunciation_file.py [-o OUTPUT_FILE]
"""

import argparse
import re
import sys

DEFAULT_OUT = "cmudict.txt"
CMUDICT_URL = "https://raw.githubusercontent.com/cmusphinx/cmudict/master/cmudict.dict"

# A bare word token in cmudict.dict may carry a variant suffix: "read(1)".
_VARIANT_RE = re.compile(r"\(\d+\)$")


def _normalize_word(token: str) -> str:
    return _VARIANT_RE.sub("", token).strip().lower()


def from_package() -> list[tuple[str, list[str]]] | None:
    """Return [(word, [phones])] using the cmudict package, or None if absent."""
    try:
        import cmudict
    except ImportError:
        return None
    print("Using offline `cmudict` package…")
    entries: list[tuple[str, list[str]]] = []
    # cmudict.dict() -> {word: [[phones], ...]} preserving variant order
    for word, prons in cmudict.dict().items():
        w = _normalize_word(word)
        if not w:
            continue
        for phones in prons:
            entries.append((w, [p.upper() for p in phones]))
    return entries


def from_download() -> list[tuple[str, list[str]]]:
    """Return [(word, [phones])] by downloading the raw cmudict.dict."""
    try:
        import requests
    except ImportError:
        sys.exit("Neither `cmudict` nor `requests` is installed. "
                 "Run: pip install cmudict   (or pip install requests)")
    print(f"Downloading {CMUDICT_URL} …")
    resp = requests.get(CMUDICT_URL, timeout=30)
    resp.raise_for_status()

    entries: list[tuple[str, list[str]]] = []
    for line in resp.text.splitlines():
        line = line.split("#", 1)[0].strip()   # drop trailing comments
        if not line or line.startswith(";;;"):
            continue
        parts = line.split()
        if len(parts) < 2:
            continue
        word = _normalize_word(parts[0])
        phones = [p.upper() for p in parts[1:]]
        if word and phones:
            entries.append((word, phones))
    return entries


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Write a normalized CMU pronunciation file."
    )
    parser.add_argument("-o", "--output", default=DEFAULT_OUT,
                        help=f"Output file path (default: {DEFAULT_OUT})")
    args = parser.parse_args()

    entries = from_package()
    if entries is None:
        entries = from_download()

    # Deduplicate identical (word, phones) lines while preserving order so that
    # genuine variants (read -> EH1 D / IY1 D) are kept but exact repeats are not.
    seen: set[tuple[str, str]] = set()
    written = 0
    with open(args.output, "w", encoding="utf-8") as fh:
        for word, phones in entries:
            joined = " ".join(phones)
            key = (word, joined)
            if key in seen:
                continue
            seen.add(key)
            fh.write(f"{word} {joined}\n")
            written += 1

    print(f"\n✓ Wrote {written:,} pronunciations  →  '{args.output}'")


if __name__ == "__main__":
    main()
