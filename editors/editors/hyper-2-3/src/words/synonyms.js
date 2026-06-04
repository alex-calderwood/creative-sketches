const ENDPOINTS = {
  wordnet: '/editors/api/synonyms',
  wordhoard: `${window.location.protocol}//${window.location.hostname}:3019/synonyms`
};

class SynonymService {
  constructor(source = 'wordhoard') {
    this.source = source;
  }

  setSource(source) {
    if (!ENDPOINTS[source]) {
      throw new Error(`Invalid source: ${source}. Valid sources: ${Object.keys(ENDPOINTS).join(', ')}`);
    }
    this.source = source;
  }

  getSource() {
    return this.source;
  }

  async getSynonyms(word, pos = null) {
    const { prefix, core, suffix } = stripPunctuation(word);
    const endpoint = ENDPOINTS[this.source];

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

    let synonyms = data.synonyms.map(s => prefix + clean(s) + suffix);
    return {
      word: word,
      synonyms: synonyms,
    };
  }
}

// Strip leading/trailing punctuation, return { prefix, core, suffix }
function stripPunctuation(word) {
  const match = word.match(/^([^\w]*)(.+?)([^\w]*)$/);
  if (!match) return { prefix: '', core: word, suffix: '' };
  return { prefix: match[1], core: match[2], suffix: match[3] };
}

function clean(synonym) {
  let cleaned = synonym.replace('(a)', '');
  cleaned = cleaned.replaceAll('_', ' ');
  return cleaned;
}

// Singleton instance
const synonymService = new SynonymService();

export function getSynonyms(word, pos = null) {
  return synonymService.getSynonyms(word, pos);
}

export function setSource(source) {
  synonymService.setSource(source);
}
