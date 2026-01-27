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
    this.directionName = options?.directionName;
    
    let initialState = null;
    if (options.documentId) {
      let doc = this.save.getDocument(this.documentId);
      let content = doc?.getField('content');
      initialState = content ? JSON.parse(content) : null;
    }

  
    this.performance = new SpellcheckPerformance();
    await this.performance.initialize({ 
        checkDelay: 500,
        squiggleColor: 'red',
        dict: 'scowl',
        reverse: true,
        initialState: initialState,
        onEdit: this.onEdit.bind(this),
      ...options
    });

    this.performance.setElement(document.querySelector('#editor'));
    this.performance.fromSCOWL();
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
    console.log("onEdit", edit);
    this.save.addEdit({text: edit.text, directionName: this.directionName});
    }
}

