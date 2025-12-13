import { Token } from '../corpus/Token.js';

/**
 * Simple reader that returns the same word repeatedly.
 * Placeholder - will be replaced with more sophisticated logic later.
 */
export class RepeatingReader {
  constructor(word) {
    this.word = word;
  }

  updateWord(word) {
    this.word = word;
  }

  read() {
    console.log('reading word', this.word);
    return new Token({ text: this.word, type: 'word' });
  }

  clone() {
    return new RepeatingReader(this.word);
  }
}

