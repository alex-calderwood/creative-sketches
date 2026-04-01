from lemminflect import getAllLemmas, getAllLemmasOOV,getAllInflectionsOOV, getAllInflections
from wordhoard import Synonyms
import sys

if len(sys.argv) < 2:
    print('Usage: python test.py <word> <upos>')
    sys.exit(1)

word = sys.argv[1] or 'amiss'
upos = sys.argv[2] if len(sys.argv) > 2 else None

print('word', word)
print('upos', upos)

synonyms = Synonyms(search_string=word).find_synonyms()
print('all synonyms', synonyms)

synonyms = Synonyms(search_string=word, sources = ['merriam-webster', 'wordnet']).find_synonyms()
print('non cloudflare synonyms', synonyms)

lemmas = getAllLemmas(word, upos=upos)
print('lemmas', lemmas)

lemmas = getAllLemmasOOV(word, upos=upos)
print('rule lemmas', lemmas)

inflections = getAllInflections(word, upos=upos)
print('inflections', inflections)

inflections = getAllInflectionsOOV(word, upos=upos)
print('rule inflections', inflections)