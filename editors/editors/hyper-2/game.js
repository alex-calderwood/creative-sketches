import { HyperPerformance } from './src/performances/hyper/HyperPerformance.js';

export class Game {
  constructor(options = {}) {
    this.performance = null;
    this.tickInterval = 2000; // ms between ticks
  }

  async initialize(options = {}) {
    this.performance = new HyperPerformance();
    this.performance.initialize();

    // Start tick loop
    // setInterval(() => {
    //   this.performance.tick();
    // }, this.tickInterval);
  }
}