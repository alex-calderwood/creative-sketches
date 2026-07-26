#!/usr/bin/env python3
"""Quick smoke test for the phonetics lookups. Usage: python test.py <word>"""

import sys

from phonetic_lookup import homophones, near_rhymes, pronunciations, rhymes

word = sys.argv[1] if len(sys.argv) > 1 else "hello"

print("word", word)
print("pronunciations", pronunciations(word))
print("homophones", homophones(word))
print("rhymes", rhymes(word)[:25])
print("near_rhymes", near_rhymes(word)[:25])
