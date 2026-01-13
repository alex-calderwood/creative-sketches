import { HyperSkipPerformance } from './src/performances/hyper/HyperSkipPerformance.js';

export class Game {
  constructor(options = {}) {
    this.performance = null;
    this.tickInterval = 2000; // ms between ticks
  }

  async initialize(options = {}) {
    this.performance = new HyperSkipPerformance();
    this.performance.initialize();

    // Start tick loop
    // setInterval(() => {
    //   this.performance.tick();
    // }, this.tickInterval);
  }
}