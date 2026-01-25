import { DropperPerformance } from './DropperPerformance.js';

export class Game {
  constructor() {
    this.performance = null;
    this.tickInterval = 2000; // ms between ticks
  }

  async initialize(options = {}) {

    console.log('initialize options', options);

    this.save = options?.save;
    this.documentId = options?.documentId;
    this.level = options?.level;

    // let initialText = null;
    // if (options.documentId) {
    //   this.documentId = options.documentId;
    //   let doc = this.save.getDocument(this.documentId);
    //   let content = doc?.getField('content');
    //   initialText = content ? JSON.parse(content).text : '';
    // }

    this.performance = new DropperPerformance();
    await this.performance.initialize({ 
      corpusFile: this?.level?.corpusFile,
      sourceText: this?.level?.sourceText,
      ...options
    });
  }

  saveState() {
    if (!this.performance) return null;
    return this.performance.getState();
  }
}