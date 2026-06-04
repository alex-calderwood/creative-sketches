import { Token } from '../corpus/Token.js';
import { getSynonyms } from '../words/synonyms.js';

/**
 * 
 */
export class SynonymReader {
  constructor(word, params={}) {
    this.word = word;
    this.params = {
      ...params,
    }
    this.synonyms = [word];
    this.index = 0;
  }

  getStreamLength() {
    return this.synonyms.length;
  }

  async updateWord(word) {
    this.word = word;
    const data = await getSynonyms(word);
    let synonyms = data.synonyms.filter(synonym => this._synonymCriteria(word, synonym));
    this.synonyms = Array.from(new Set([word, ...synonyms]));
  }

  _synonymCriteria(originalWord, synonym) {
    let nearLength = Math.abs(originalWord.length - synonym.length) < originalWord.length / 2;
    let notJustDifferentCase = originalWord.toLowerCase() !== synonym.toLowerCase();
    return nearLength && notJustDifferentCase;
  }

  read() { 
    let word = this.synonyms[this.index];
    this.index = (this.index + 1) % this.synonyms.length;

    return new Token({ text: word, type: 'word' });
  }

  clone() {
    return new SynonymReader(this.word);
  }
}

