# Phonetics: homophones, rhymes, near-rhymes

Pronunciation data from the [CMU Pronouncing Dictionary](https://github.com/cmusphinx/cmudict),
keyed so that homophone / rhyme / near-rhyme lookups are simple indexed joins.

## Build

    pip install cmudict          # offline source (or: pip install requests)
    python build_phonetics_cache.py

This runs `create_pronunciation_file.py` first (if `cmudict.txt` is missing) to
fetch and normalize the dictionary, then builds the `pronunciations` table in
the shared `../../synonym_cache.db`.

## Table: `pronunciations`

One row per pronunciation variant (e.g. `read` -> `R EH1 D` and `R IY1 D`):

| column | meaning | example (`hello`) |
|---|---|---|
| `word` | lowercase word (repeats across variants) | `hello` |
| `variant` | 0-based variant index | `0` |
| `phonemes` | ARPAbet + stress | `HH AH0 L OW1` |
| `homophone_key` | stress stripped — same key ⇒ homophone | `HH AH L OW` |
| `rhyme_key` | last stressed vowel → end — same key ⇒ perfect rhyme | `OW1` |
| `near_rhyme_key` | vowels of the rhyme part — same key ⇒ slant rhyme (assonance) | `OW` |
| `syllables` | vowel count | `2` |

**Near-rhyme** is defined as *assonance*: matching the vowel run of the rhyme
part, ignoring consonants and stress. `near_rhymes()` excludes exact rhymes so
you get additional slant candidates, not the perfect ones again. To change the
definition (e.g. consonance instead), edit `derive_keys()` in
`build_phonetics_cache.py` and rebuild.

## Lookups

CLI:

    python phonetic_lookup.py rhymes hello
    python phonetic_lookup.py homophones to
    python phonetic_lookup.py near-rhymes orange
    python phonetic_lookup.py pronounce read

Importable:

    from phonetic_lookup import homophones, rhymes, near_rhymes, pronunciations

Over HTTP (via `word_cache.py`, port 3020):

    curl "http://127.0.0.1:3020/rhymes?word=hello"
    curl "http://127.0.0.1:3020/homophones?word=to"
    curl "http://127.0.0.1:3020/near-rhymes?word=orange"
    curl "http://127.0.0.1:3020/phonetics?word=hello"   # all four at once

## Test

    python test.py hello
