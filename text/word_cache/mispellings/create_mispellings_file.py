#!/usr/bin/env python3
"""
Scrape Wikipedia:Lists_of_common_misspellings (A–Z) via the MediaWiki API
and write a consolidated misspelling=>correction txt file.

Output format (one entry per line):
    misspelling=>correction[, correction2, ...]

Usage:
    pip install requests tqdm
    python scrape_misspellings.py [-o OUTPUT_FILE]
"""

import re
import time
import argparse
import requests
from tqdm import tqdm

# ── Config ────────────────────────────────────────────────────────────────────

API_URL     = "https://en.wikipedia.org/w/api.php"
BASE_PAGE   = "Wikipedia:Lists_of_common_misspellings"
LETTERS     = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
DELAY       = 0.5          # seconds between requests — be polite to the API
DEFAULT_OUT = "misspellings.txt"

# ── Fetch ─────────────────────────────────────────────────────────────────────

def fetch_wikitext(letter: str, session: requests.Session) -> str:
    """Return raw wikitext for the given letter sub-page, or '' on failure."""
    params = {
        "action":        "query",
        "titles":        f"{BASE_PAGE}/{letter}",
        "prop":          "revisions",
        "rvprop":        "content",
        "rvslots":       "main",
        "format":        "json",
        "formatversion": "2",
    }
    try:
        r = session.get(API_URL, params=params, timeout=15)
        r.raise_for_status()
        data = r.json()
        page = data["query"]["pages"][0]
        if page.get("missing"):
            return ""
        return page["revisions"][0]["slots"]["main"]["content"]
    except Exception as exc:
        tqdm.write(f"  [warn] {letter}: {exc}")
        return ""

# ── Parse ─────────────────────────────────────────────────────────────────────

# Matches lines like:
#   * {{search link|mispelling|...}} (correct spelling)
#   * mispelling (correct spelling)
#   * mispelling (correct spelling, alternate)
_ENTRY_RE = re.compile(
    r"^\*\s+"           # bullet
    r"(.*?)"            # group 1: misspelling token (lazy)
    r"\s*\(([^)]+)\)"   # group 2: (corrections)
    r"\s*$",
    re.MULTILINE,
)

# Strip wiki markup
_TMPL_RE = re.compile(r"\{\{[^}]*?\|([^|}]+?)(?:\|[^}]*)?\}\}")
_LINK_RE = re.compile(r"\[\[(?:[^|\]]*\|)?([^\]]+)\]\]")
_MARKUP  = re.compile(r"'{2,3}|<[^>]+>")
_BRACKET_RE = re.compile(r"\s*\[[^\]]*\]")
_DESCRIPTIVE_RE = re.compile(
    r"(?:variant|false positive|obsolete|informal|acceptable|should be used"
    r"|per WP:|uppercase|lowercase)",
    re.IGNORECASE,
)


def clean(token: str) -> str:
    token = _TMPL_RE.sub(r"\1", token)
    token = _LINK_RE.sub(r"\1", token)
    token = _MARKUP.sub("", token)
    return token.strip()


def parse_entries(wikitext: str) -> list[tuple[str, str]]:
    results = []
    for m in _ENTRY_RE.finditer(wikitext):
        misspelling = clean(m.group(1))
        corrections = clean(m.group(2))
        if not misspelling or not corrections:
            continue
        if misspelling.startswith("=") or len(misspelling) > 60:
            continue
        results.append((misspelling, corrections))
    return results


def expand_entry(misspelling: str, corrections: str) -> list[tuple[str, str]]:
    """Split corrections and return (correction, misspelling) pairs."""
    misspelling = re.sub(r"\s*\([^)]*\)", "", misspelling.strip('"')).strip()
    corrections = _BRACKET_RE.sub("", corrections)
    pairs = []
    for part in corrections.split(","):
        part = part.strip()
        if not part:
            continue
        if _DESCRIPTIVE_RE.search(part):
            continue
        if len(part.split()) > 4:
            continue
        pairs.append((part, misspelling))
    return pairs

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Download Wikipedia common-misspellings list (A–Z)."
    )
    parser.add_argument(
        "-o", "--output", default=DEFAULT_OUT,
        help=f"Output file path (default: {DEFAULT_OUT})"
    )
    args = parser.parse_args()

    session = requests.Session()
    session.headers["User-Agent"] = (
        "misspellings-scraper/1.0 "
        "(https://en.wikipedia.org/wiki/Wikipedia:Lists_of_common_misspellings)"
    )

    all_entries: list[tuple[str, str]] = []
    skipped: list[str] = []

    with tqdm(
        LETTERS,
        desc="Fetching pages",
        unit="letter",
        bar_format="{l_bar}{bar}| {n_fmt}/{total_fmt}  [{elapsed}<{remaining}]",
        colour="cyan",
    ) as pbar:
        for letter in pbar:
            pbar.set_postfix(letter=letter)
            wikitext = fetch_wikitext(letter, session)

            if not wikitext:
                skipped.append(letter)
                tqdm.write(f"  [skip] {letter}: no content returned")
            else:
                entries = parse_entries(wikitext)
                all_entries.extend(entries)
                tqdm.write(f"  [ok]   {letter}: {len(entries):>4} entries")

            time.sleep(DELAY)

    # Expand into (correction, misspelling) pairs and deduplicate
    seen: set[tuple[str, str]] = set()
    expanded: list[tuple[str, str]] = []
    for mis, cor in all_entries:
        for pair in expand_entry(mis, cor):
            key = (pair[0].lower(), pair[1].lower())
            if key not in seen:
                seen.add(key)
                expanded.append(pair)

    expanded.sort(key=lambda x: (x[1].lower(), x[0].lower()))

    with open(args.output, "w", encoding="utf-8") as fh:
        for cor, mis in expanded:
            fh.write(f"{cor}=>{mis}\n")

    print(f"\n✓ Wrote {len(expanded):,} entries  →  '{args.output}'")
    if skipped:
        print(f"  Letters with no data: {', '.join(skipped)}")


if __name__ == "__main__":
    main()