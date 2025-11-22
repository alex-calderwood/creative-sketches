import { getScaleModifier, getBlockText, noteToHue, updateBlockColor, createBlockAt } from './block.js';
import { moveTo, singleton } from './utils.js';
import { CorpusSelect } from './src/configuration/CorpusSelect.js';
import { TextStream } from './src/streams/TextStream.js';
import { TextStreamEntity } from './src/streams/TextStreamEntity.js';
import { SubtleDomTextStreamComponent } from './src/games/clock/SubtleDomTextStreamComponent.js';
import { Token } from './src/corpus/Token.js';

import { ClockController } from './src/games/clock/ClockController.js';
import { ClockMapper } from './src/games/clock/ClockMapper.js';
import { ClockRender } from './src/games/clock/ClockRender.js';

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

// resize a token to a new width and height using the transform property scaleX and scaleY
export function resizeToken(element, width, height) {
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
  element.style.fontSize = `${height}px`;

  let blockTokenElement = element.querySelector('.block-word');
  blockTokenElement.style.transform = `scaleX(1) scaleY(1)`;
  // blockTokenElement.style.transformOrigin = `center center`;

  let additionalScaleMod = getScaleModifier(element);

  requestAnimationFrame(() => { // make sure it has rendered before measuring
    setTimeout(() => {
    let rect = blockTokenElement.getBoundingClientRect();
    let scaleX = width / rect.width;
    let scaleY = height / rect.height;

    scaleX *= additionalScaleMod.x;
    scaleY *= additionalScaleMod.y;
    
    blockTokenElement.style.transform = `scaleX(${scaleX}) scaleY(${scaleY})`;
    }, 1); // Just 1ms delay helps the calculation be correct
  });
}

export class Game {
  static DEFAULTS = {
    tickTime: 1,
    dropTimePerBox: 50,
    blockWidth: 100,
    blockHeight: 60,
    numHands: 10,
  };

  constructor(options = {}) {
    this.tokenElements = [];
    this.reader = null;
    
    // Apply defaults and options
    const config = { ...Game.DEFAULTS, ...options };
    
    this.colorBy = config.colorBy;
    this.numColumns = config.numColumns;
    this.numRows = config.numRows;
    this.blockWidth = config.blockWidth;
    this.blockHeight = config.blockHeight;
    this.numHands = config.numHands;
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
    this.reader = await new CorpusSelect().getReader();
    console.log('Loaded Reader:', this.reader);

    this.gameRender = new ClockRender({blockWidth: this.blockWidth, blockHeight: this.blockHeight});

    // Create streams based on numHands configuration
    this.streamLength = 20;
    const streams = [];
    let top = 200;

    for (let i = 0; i < this.numHands; i++) {
      // Clone the reader for each stream (except the first one uses the original)
      const reader = i === 0 ? this.reader : this.reader.clone();
      
      // Create a text stream entity with its own reader and component
      const stream = new TextStreamEntity(this, 
        new TextStream(this.streamLength, reader),
        new SubtleDomTextStreamComponent(this.gameRender, {
          blockWidth: this.blockWidth,
          blockHeight: this.blockHeight,
          from: {left: window.innerWidth - this.blockWidth, top: top},
          to: {left: 0, top: top}
        })
      );
      
      streams.push(stream);
      top += this.blockHeight * .8;
    }

    this.gameRender.setStreams(streams);

    // Set up controls and event listeners
    await this.setupControls({game: this.gameRender});
    
    // Only do these once on first initialization
    if (!this.firstInitDone) {
      // await this.initializeSounds();
      
      // Start the game loop
      setInterval(() => {
        this.tick();
      }, this.tickTime);
      
      // Call controller tick every second
      setInterval(() => {
        if (this.controller) {
          console.log("Calling controller tick");
          this.controller.executeAction('Tick', {});
        }
      }, 1000);
      
      this.firstInitDone = true;
    }


    this.gameRender.initialize();
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
    this.gameRender.tick();
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


