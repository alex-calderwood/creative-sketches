import { Token } from '../corpus/Token.js';
import { getSynonyms } from '../words/synonyms.js';

export class SynonymReader {
  constructor(word, params={}) {
    this.word = word;
    this.params = {
      ...params,
    }
    this.synonyms = [word];
    this.index = 0;
    this.isUpdating = false;
  }

  getStreamLength() {
    return this.synonyms.length;
  }

  async updateWord(word, pos = null) {
    this.isUpdating = true;
    try {
      this.word = word;
      this.synonyms = [word];
      this.index = 0;
      const data = await getSynonyms(word, pos);
      if (this.word !== word) return; // to prevent race condition errors if updateWord call is stale
      let synonyms = data.synonyms.filter(synonym => this._synonymCriteria(word, synonym));
      
      // Atomic update - replace synonyms all at once
      this.synonyms = Array.from(new Set([...synonyms, word]));
      this.index = 0; // Reset index after update
    } finally {
      this.isUpdating = false;
    }
  }

  _synonymCriteria(originalWord, synonym) {
    let nearLength = Math.abs(originalWord.length - synonym.length) < originalWord.length / 2;
    let notJustDifferentCase = originalWord.toLowerCase() !== synonym.toLowerCase();
    return nearLength && notJustDifferentCase;
  }

  read() { 
    // During updates, read() continues to work with existing synonyms
    // The synonyms array is replaced atomically when update completes
    let word = this.synonyms[this.index];
    this.index = (this.index + 1) % this.synonyms.length;

    if (word == null) {
      console.error("Read null word", word, this.index, this.synonyms, this.synonyms.length);
    }

    return new Token({ text: word, type: 'word' });
  }

  clone() {
    return new SynonymReader(this.word);
  }
}