import { DropperPerformance } from './DropperPerformance.js';
import { getText, joinText } from '/editors/drifts/ContentQuery.js';
// import { CustomTextCorpus } from '/editors/vault/corpus/CustomTextCorpus.js'

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

    // Drift sources (interlace + the drift's edits) only apply when we're
    // actually in a drift level. Standalone/mismatched editor → leave
    // sourceTexts null so DropperPerformance falls back to corpusFile/default.
    let sourceTexts = null;
    if (this.level) {
      // All edits made across this drift, falling back to the level's
      // editsBackup when none exist (sandbox, or no spellcheck level played yet).
      const editEntries = await getText(this.save, {
        type: 'edits',
        scope: 'drift',
        filter: 'all',
        fallback: this.level.editsBackup,
      }, {
        driftName: this.driftName,
        progression: options?.progression || [],
      });

      // Only include sources that actually carry text.
      const sources = [];
      if (this.level.sourceText) sources.push({ name: 'interlace', text: this.level.sourceText });
      const editsText = joinText(editEntries, ' ');
      if (editsText) sources.push({ name: 'mistake', text: editsText });
      if (sources.length) sourceTexts = sources;
    }

    this.performance = new DropperPerformance();
    await this.performance.initialize({ 
      corpusFile: this?.level?.corpusFile,
      sourceTexts: sourceTexts,
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