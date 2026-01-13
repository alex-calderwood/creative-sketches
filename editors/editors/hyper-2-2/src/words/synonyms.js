// Global variable to choose synonym source
const SYNONYM_SOURCE = 'wordhoard'; // values: wordnet, wordhoard

const ENDPOINTS = {
  wordnet: '/editors/api/synonyms',
  wordhoard: `${window.location.protocol}//${window.location.hostname}:3019/synonyms`
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