import { SpellcheckPerformance } from './SpellcheckPerformance.js';

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
    this.save.addEdit({text: edit.text, driftName: this.driftName});
  }

  resetEdits(){
    this.save.deleteEdits({driftName: this.driftName});
    this.save.saveToLocalStorage();
  }
}

