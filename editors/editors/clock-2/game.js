import { getBlockText, noteToHue, updateBlockColor, createBlockAt } from './block.js';
import { moveTo, singleton } from './utils.js';
import { CorpusSelect } from './src/configuration/CorpusSelect.js';
import { CustomTextCorpus } from './src/corpus/CustomTextCorpus.js';
import { TextReader } from './src/readers/TextReader.js';
import { TextStream } from './src/streams/TextStream.js';
import { TextStreamEntity } from './src/streams/TextStreamEntity.js';
import { SubtleDomTextStreamComponent } from './src/performances/clock/SubtleDomTextStreamComponent.js';
import { Token } from './src/corpus/Token.js';

import { ClockController } from './src/performances/clock/ClockController.js';
import { ClockMapper } from './src/performances/clock/ClockMapper.js';
import { ClockPerformance } from './src/performances/clock/ClockPerformance.js';

// given a dict with weights or probabilities, pick one accordingly
// assign the remaining probability mass to any key with value -1
function roll(probabilities) {
  let defaultKey = Object.keys(probabilities).find(key => probabilities[key] === -1);
  let roll = Math.random();
  
  // Calculate total probability mass excluding default key
  let totalProb = 0;
  for (let key in probabilities) {
    if (probabilities[key] !== -1) {
      totalProb += probabilities[key];
    }
  }

  // If we have a default key, assign remaining probability mass
  if (defaultKey !== undefined && totalProb < 1) {
    probabilities[defaultKey] = 1 - totalProb;
  }

  // Sample using CDF
  let cumulative = 0;
  for (let key in probabilities) {
    cumulative += probabilities[key];
    if (roll <= cumulative) {
      return key;
    }
  }

  // Fallback to last key (shouldn't happen with valid probabilities)
  return defaultKey;
}

export class Game {
  static DEFAULTS = {
    tickTime: 1,
    dropTimePerBox: 50,
    blockWidth: 100,
    blockHeight: 40,
    streamBlockWidth: 50,
    streamBlockHeight: 20,
    numHands: 9,
    streamLength: 30,
    streamTop: 35
  };

  constructor(options = {}) {
    this.tokenElements = [];
    this.reader = null;
    
    // Apply defaults and options
    const config = { ...Game.DEFAULTS, ...options };

    // Bind config.blockHeight => this.blockHeight
    for (let key in config) {
      this[key] = config[key];
    }
  }

  /* 
    Mark that the player has taken some action
  */
  onStart() {
    const controlIcons = document.getElementById('control-icons');
    if (controlIcons) {
      controlIcons.classList.add('hidden');
    }
  }

  // loadStylesheet() {
  //   // Remove any existing game-specific stylesheet
  //   const oldSheet = document.getElementById('game-style');
  //   if (oldSheet) oldSheet.remove();
    
  //   // Add this game's stylesheet
  //   const link = document.createElement('link');
  //   link.id = 'game-style';
  //   link.rel = 'stylesheet';
  //   link.href = 'clock.css';
  //   document.head.appendChild(link);
  // }

  async initialize(options = {}) {

    // Decide on a reader
    // this.reader = await new CorpusSelect().getReader();
    const corpus = new CustomTextCorpus();
    await corpus.loadTextsFromJSON();
    await corpus.loadText('tikal');
    this.reader = new TextReader(corpus);
    console.log('Loaded Reader:', this.reader);

    this.performance = new ClockPerformance({blockWidth: this.blockWidth, blockHeight: this.blockHeight});

    const streams = [];
    let top = this.streamTop;

    for (let i = 0; i < this.numHands; i++) {
      // Clone the reader for each stream (except the first one uses the original)
      const reader = i === 0 ? this.reader : this.reader.clone();
      
      // Create a text stream entity with its own reader and component
      const stream = new TextStreamEntity(this, 
        new TextStream(this.streamLength, reader),
        new SubtleDomTextStreamComponent(this.performance, {
          blockWidth: this.streamBlockWidth,
          blockHeight: this.streamBlockHeight,
          from: {left: window.innerWidth - this.streamBlockWidth, top: top},
          to: {left: 0, top: top}
        })
      );
      
      streams.push(stream);
      top += this.streamBlockHeight * .8;
    }

    this.performance.setStreams(streams);

    // Set up controls and event listeners
    await this.setupControls({game: this.performance});
    
    // Only do these once on first initialization
    if (!this.firstInitDone) {
      // await this.initializeSounds();
      
      // Start the game loop
      setInterval(() => {
        this.tick();
      }, this.tickTime);
      
      // Call controller tick every second
      // setInterval(() => {
      //   if (this.controller) {
      //     console.log("Calling controller tick");
      //     this.controller.executeAction('Tick', {});
      //   }
      // }, 1000);
      
      this.firstInitDone = true;
    }

    this.performance.initialize();
    this.drawBackground();

  }


  async setupControls(options) {
    this.controller = new ClockController(options.game, {numHands: this.numHands});
    this.mapper = new ClockMapper({numHands: this.numHands});
    this.mapper.initialize();
    this.mapper.setController(this.controller);
  }


  drawBackground() {
    let elt = singleton('background');
  }


  tick() {
    this.performance.tick();
  }

  printState() {
    console.log("state", this.state)
  }

  // Not to be used generally, just for special token replacements
  changeCurrentToken(text) {
    // this.game.state.currentBlock.innerHTML = newView.text();

    let newToken = new Token({
      text: text,
      type: 'word',
      pos: 'word',
      source: 'user',
    })
    let newBlock = createBlockAt(newToken, this.state.currentBlockLeft, this.state.currentBlockTop, this.columnWidths[this.state.curX], this.rowHeights[this.state.curY]);
    this.deleteCurrentBlock();
    this.setCurrentBlock(newBlock, newToken);
  }

}


