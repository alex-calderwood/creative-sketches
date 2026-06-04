import { SpellcheckPerformance } from './SpellcheckPerformance.js';
import { putText } from '/editors/drifts/ContentQuery.js';

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
    
    // MetaGame passes the saved document state (or level seed) as initialState.
    const initialState = options.initialState ?? null;

    this.performance = new SpellcheckPerformance();
    await this.performance.initialize({ 
        initialState: initialState,
        checkDelay: 500,
        squiggleColor: 'red',
        dict: 'scowl',
        reverse: true,
        onEdit: this.onEdit.bind(this),
      ...options
    });

    this.performance.fromSCOWL();

    this.resetEdits();
  }

  // Called by MetaGame.js
  saveState() {
    if (!this.performance) return null;
    if (!this.performance.getState) {
        console.error("SpellcheckPerformance.getState is not implemented");
        return null;
    }
    return this.performance.getState();
  }

  onEdit(edit) {
    // Edits are attached to the document being written, so any later level in
    // the drift can read them via getText({ type: 'edits', scope: 'drift' }).
    if (!this.save || !this.documentId) return;
    putText(this.save, { type: 'edits', documentId: this.documentId, mode: 'append' }, { text: edit.text });
  }

  resetEdits(){
    // Clear this document's edits at load so we re-capture a fresh session
    // rather than accumulating duplicates of already-flagged misspellings.
    if (!this.save || !this.documentId) return;
    const doc = this.save.getDocument(this.documentId);
    doc?.setEdits([]);
    this.save.saveToLocalStorage();
  }
}

