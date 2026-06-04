import { HyperSkipPerformance } from './src/performances/hyper/HyperSkipPerformance.js';

export class Game {
  constructor(options = {}) {
    this.performance = null;
    this.save = options.save || null;
    this.documentId = options.documentId || null;
  }

  async initialize(options = {}) {
    // MetaGame passes the saved document state (or level seed) as initialState.
    const initialText = options.initialState?.text ?? '';

    this.performance = new HyperSkipPerformance({ initialText });
    this.performance.initialize();
  }

  saveState() {
    if (!this.performance) return null;
    return this.performance.getState();
  }
}