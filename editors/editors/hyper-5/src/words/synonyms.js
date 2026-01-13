// Global variable to choose synonym source
const SYNONYM_SOURCE = 'wordhoard'; // values: wordnet, wordhoard

const ENDPOINTS = {
  wordnet: '/editors/api/synonyms',
  wordhoard: `${window.location.protocol}//${window.location.hostname}:3019/synonyms`
};

export async function getSynonyms(word) {
  const endpoint = ENDPOINTS[SYNONYM_SOURCE];
  const response = await fetch(`${endpoint}?word=${encodeURIComponent(word)}`);
  const data = await response.json();

  if (data.error || !data.synonyms) {
    return {
      word: word,
      synonyms: [],
    };
  }

  let synonyms = data.synonyms.map(clean);
  return {
    word: data.word,
    synonyms: synonyms,
  };
}

function clean(synonym) {
  let cleaned = synonym.replace('(a)', '');
  cleaned = cleaned.replaceAll('_', ' ');
  return cleaned;
}
