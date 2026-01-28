import { DropperPerformance } from './DropperPerformance.js';

export class Game {
  constructor() {
    this.performance = null;
    this.tickInterval = 2000; // ms between ticks
  }

  async initialize(options = {}) {
    this.save = options?.save;
    this.documentId = options?.documentId;
    this.level = options?.level;
    this.driftName = options?.driftName;

    let initialState = null;
    if (options.documentId) {
      let doc = this.save.getDocument(this.documentId);
      let content = doc?.getField('content');
      initialState = content ? JSON.parse(content) : null;
    }

    let getEdits = () => {
      let edits = this.save?.getEdits({driftName: this.driftName});
      if (!edits) {
        return null;
      }

      return edits.map(edit => edit.text).join(' ');
    }

    let edits = getEdits();

    this.performance = new DropperPerformance();
    await this.performance.initialize({ 
      corpusFile: this?.level?.corpusFile,
      sourceTexts: [
        {
          name: 'interlace',
          text: this?.level?.sourceText,
          // kind: 'corpusFile',
        },
        {
          name: 'edits',
          text: edits,
        },
      ],
      initialState: initialState,
      ...options
    });
  }

  // Called by MetaGame.js
  saveState() {
    if (!this.performance) return null;
    return this.performance.getState();
  }
}