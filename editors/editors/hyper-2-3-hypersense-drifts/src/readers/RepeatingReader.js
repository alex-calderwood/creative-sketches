import { Token } from '../corpus/Token.js';

/**
 * Simple reader that returns the same word repeatedly.
 * Placeholder - will be replaced with more sophisticated logic later.
 */
export class RepeatingReader {
  constructor(word, params={}) {
    this.word = word;
    this.params = {
      cycle: true,
      ...params,
    }
    this.history = [];
    this.history.push(word);
    this.historyIndex = 0;
  }

  updateWord(word) {
    this.word = word;
    this.history.push(word);
  }

  read() {
    let word;
    if (this.params.cycle) {
      word = this.history[this.historyIndex];
      this.historyIndex = (this.historyIndex + 1) % this.history.length;
    } else {
      word = this.word;
    }
    return new Token({ text: word, type: 'word' });
  }

  clone() {
    return new RepeatingReader(this.word);
  }
}

