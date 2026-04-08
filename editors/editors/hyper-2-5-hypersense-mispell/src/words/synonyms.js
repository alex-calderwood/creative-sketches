const ENDPOINTS = {
  'synonyms-wordnet': '/editors/api/synonyms-wordnet/synonyms',
  'synonyms-cache': '/editors/api/synonyms-cache/synonyms',
  'synonyms-online': '/editors/api/synonyms-online/synonyms',
  'misspellings': '/editors/api/synonyms-cache/synonyms',
};

class SynonymService {
  constructor(source = 'synonyms-cache') {
    this.setSource(source);
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
    
    if (this.source === 'misspellings') url += `&misspellings=y`;

    const response = await fetch(url);
    const data = await response.json();

    if (this.source === 'misspellings') {
      data.synonyms = data.misspellings || [];
    }

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
