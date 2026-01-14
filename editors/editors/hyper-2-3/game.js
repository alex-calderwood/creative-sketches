import { HyperSkipPerformance } from './src/performances/hyper/HyperSkipPerformance.js';

export class Game {
  constructor(options = {}) {
    this.performance = null;
    this.tickInterval = 2000; // ms between ticks
    this.save = options.save || null;
    this.documentId = options.documentId || null;
  }

  async initialize(options = {}) {
    if (options.save) {
      this.save = options.save;
    }
    if (options.documentId) {
      this.documentId = options.documentId;
    }

    let doc = this.save.getDocument(this.documentId);
    let initialText = doc.getField('content');
    
    this.performance = new HyperSkipPerformance({ initialText });
    this.performance.initialize();
  }

  saveState() {
    if (!this.performance) return null;
    return this.performance.getState();
  }

}