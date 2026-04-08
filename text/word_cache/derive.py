import logging
import sys
import nltk
from collections import deque

nltk.download("wordnet")
nltk.download("omw-1.4")
from nltk.corpus import wordnet


def adverbs_from_verb(lemma: str, max_hops: int = 4) -> list[str]:
    """Adverbs for ``lemma`` via derivationally_related_forms BFS, plus morphology fallback.

    BFS seeds **verb** and **adjective** synsets (incl. satellite adj.). Many pairs
    (e.g. *quick* → *quickly*, *operate* → *operationally*) have **no** such path in
    WordNet; if ``lemma`` has adjective synsets, we also add common derived adverb
    spellings (``-ly``, ``-eningly``, ``-ishly``, …) that WordNet actually lists as
    adverbs—e.g. *sick* → *sickeningly* (not *sickly*, often adj-only in WordNet).
    """
    out: set[str] = set()
    q: deque[tuple[object, int]] = deque()
    visited: set[str] = set()
    step = 0

    def enqueue(lem: object, depth: int, via: str) -> None:
        nonlocal step
        key = lem.key()
        syn = lem.synset()
        if key in visited:
            logger.debug(
                "  skip enqueue (seen): %s | %s depth=%d via=%s",
                key,
                _synset_label(syn),
                depth,
                via,
            )
            return
        visited.add(key)
        q.append((lem, depth))
        logger.debug(
            "  enqueue #%d: %s [%s] %s | depth=%d via=%s | def=%r",
            len(q),
            key,
            lem.name(),
            syn.pos(),
            depth,
            via,
            syn.definition()[:120] + ("…" if len(syn.definition()) > 120 else ""),
        )

    logger.info("adverbs_from_verb(%r, max_hops=%d)", lemma, max_hops)
    seeds: list = []
    for pos in _SEED_POSES:
        part = wordnet.synsets(lemma, pos=pos)
        logger.info(
            "seed synsets for %r pos=%r: count=%d",
            lemma,
            pos,
            len(part),
        )
        seeds.extend(part)
    logger.info("total seed synsets for %r: %d", lemma, len(seeds))
    for i, syn in enumerate(seeds):
        logger.info(
            "  seed[%d] %s lemmas=%s def=%r",
            i,
            _synset_label(syn),
            [l.name() for l in syn.lemmas()],
            syn.definition(),
        )
        for lem in syn.lemmas():
            enqueue(lem, 0, via="SEED")

    while q:
        lem, depth = q.popleft()
        step += 1
        syn = lem.synset()
        pos = syn.pos()
        logger.debug(
            "--- step %d | depth=%d/%d | %s | lemma=%s | pos=%s | %s | def=%r",
            step,
            depth,
            max_hops,
            lem.key(),
            lem.name(),
            pos,
            _synset_label(syn),
            syn.definition(),
        )
        if pos == wordnet.ADV:
            surface = lem.name().replace("_", " ")
            out.add(surface)
            logger.info("  *** collected adverb: %r (from %s)", surface, lem.key())
        if depth >= max_hops:
            logger.debug("  stop expanding: depth %d >= max_hops %d", depth, max_hops)
            continue
        related = lem.derivationally_related_forms()
        logger.debug(
            "  derivationally_related_forms count=%d for %s",
            len(related),
            lem.key(),
        )
        for r in related:
            rs = r.synset()
            logger.debug(
                "    -> %s [%s] %s | %s | def=%r",
                r.key(),
                r.name(),
                rs.pos(),
                _synset_label(rs),
                rs.definition(),
            )
            enqueue(r, depth + 1, via=lem.key())

    has_adj_seed = any(
        s.pos() in (wordnet.ADJ, wordnet.ADJ_SAT) for s in seeds
    )
    if has_adj_seed:
        morph = _adverbs_by_morphology_verified(lemma)
        before = len(out)
        out |= morph
        logger.info(
            "morphology fallback (adj seeds): added %d surface(s)",
            len(out) - before,
        )

    result = sorted(out)
    logger.info("done: %d adverb(s): %s", len(result), result)
    return result


if __name__ == "__main__":
    verbose = "--verbose" in sys.argv
    argv = [a for a in sys.argv[1:] if a != "--verbose"]
    logging.basicConfig(
        level=logging.DEBUG if verbose else logging.WARNING,
        format="%(levelname)s %(message)s",
    )
    lemmas = argv if argv else list(DEMO_LEMMAS)
    for w in lemmas:
        print(f"{w}: {adverbs_from_verb(w)}")
