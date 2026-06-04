import { FragmentPerformance } from './src/performances/fragment/FragmentPerformance.js';

export class Game {
  constructor(options = {}) {
    this.performance = null;
    this.params = {
      overlayCount: 8,
      baseVelocity: 0.1,
      cornerPauseMs: 3000,
      fontSize: 16,
      fontFamily: 'SquareAntiqua'
    };
  }

  async initialize(params = {}) {
    this.params = { ...this.params, ...params };

    this.performance = new FragmentPerformance(this.params);
    this.performance.initialize();

    // MetaGame passes the saved document state (or level seed) as initialState.
    if (this.params.initialState) {
      this.loadState(this.params.initialState);
    }
  }

  saveState() {
    return this.performance?.saveState();
  }

  loadState(state) {
    this.performance?.loadState(state);
  }
}
