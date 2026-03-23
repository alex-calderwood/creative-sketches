// Global variable to choose synonym source
const SYNONYM_SOURCE = 'synonyms-online'; // values: synonyms-wordnet, synonyms-cache, synonyms-online

const ENDPOINTS = {
  'synonyms-wordnet': '/editors/api/synonyms-wordnet/synonyms',
  'synonyms-cache': '/editors/api/synonyms-cache/synonyms',
  'synonyms-online': '/editors/api/synonyms-online/synonyms',
};

// Strip leading/trailing punctuation, return { prefix, core, suffix }
function stripPunctuation(word) {
  const match = word.match(/^([^\w]*)(.+?)([^\w]*)$/);
  if (!match) return { prefix: '', core: word, suffix: '' };
  return { prefix: match[1], core: match[2], suffix: match[3] };
}

export async function getSynonyms(word, pos = null) {
  const { prefix, core, suffix } = stripPunctuation(word);

  const endpoint = ENDPOINTS[SYNONYM_SOURCE];

  let url = `${endpoint}?word=${encodeURIComponent(core)}`;
  if (pos) url += `&pos=${encodeURIComponent(pos)}`;
  const response = await fetch(url);
  const data = await response.json();

  if (data.error || !data.synonyms) {
    return {
      word: word,
      synonyms: [],
    };
  }

  // Reattach punctuation to each synonym
  let synonyms = data.synonyms.map(s => prefix + clean(s) + suffix);
  return {
    word: word,
    synonyms: synonyms,
  };
}

function clean(synonym) {
  let cleaned = synonym.replace('(a)', '');
  cleaned = cleaned.replaceAll('_', ' ');
  return cleaned;
}
