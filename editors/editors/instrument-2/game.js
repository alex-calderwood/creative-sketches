import { getScaleModifier, getBlockText, noteToHue, updateBlockColor } from './block.js';
import { moveTo, singleton } from './utils.js';
import { WikiSelect } from './src/configuration/WikiSelect.js';
import { ControlSelect } from './src/configuration/ControlSelect.js';
import { TextStream } from './src/streams/TextStream.js';
import { TextStreamEntity } from './src/streams/TextStreamEntity.js';
import { ClassicDomTextStreamComponent } from './src/streams/TextStreamComponent.js';
import soundManager from './sound.js';

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

const DELETE_COLOR = "#e83713";

export class Game {
  static DEFAULTS = {
    numColumns: 10,
    numRows: 10,
    gridStartX: 50,
    gridStartY: 150,
    gridEndGapX: 50,
    gridEndGapY: 50,
    colorBy: 'pos',
    probabilities: {
      delete: 0.25,
      constraint: 0,
      token: -1,
    },
    numInitialConstraints: 0,
    tickTime: 100,
    dropTimePerBox: 50,
    completionTime: 1000,
    arrowSpeed: 170,
    completedTokensTop: 20,
  };

  constructor(options = {}) {
    this.tokenElements = [];
    this.reader = null;
    
    // Apply defaults and options
    const config = { ...Game.DEFAULTS, ...options };
    
    this.colorBy = config.colorBy;
    this.numColumns = config.numColumns;
    this.numRows = config.numRows;

    // Grid positioning
    this.gridStartX = config.gridStartX;
    this.gridStartY = config.gridStartY;
    this.gridEndGapX = config.gridEndGapX;
    this.gridEndGapY = config.gridEndGapY;
    this.gridWidth = window.innerWidth - this.gridStartX - this.gridEndGapX;
    this.gridHeight = window.innerHeight - this.gridStartY - this.gridEndGapY;

    this.probabilities = config.probabilities;
    this.numInitialConstraints = config.numInitialConstraints;

    console.log({
      numColumns: this.numColumns,
      numRows: this.numRows,
      gridOffsetX: this.gridStartX,
      gridOffsetY: this.gridStartY,
    })

    this.tickTime = config.tickTime;
    this.dropTimePerBox = config.dropTimePerBox;
    this.completionTime = config.completionTime;
    this.arrowSpeed = config.arrowSpeed;
    this.completedTokensTop = config.completedTokensTop;
    
    // Track if we've done first-time initialization
    this.firstInitDone = false;
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

  async initialize(options = {}) {
    // Set or update grid dimensions
    if (options.numColumns) this.numColumns = options.numColumns;
    if (options.numRows) this.numRows = options.numRows;

    // Calculate cell sizes
    this.cellHeight = this.gridHeight / this.numRows;
    this.cellWidth = this.gridWidth / this.numColumns;
    this.columnWidths = Array(this.numColumns).fill(this.cellWidth);
    this.rowHeights = Array(this.numRows).fill(this.cellHeight);


    // Clear current game state if it exists
    if (this.state) {
      if (this.state.currentBlock) {
        this.state.currentBlock.remove();
      }
      
      // Clear grid
      for (let x = 0; x < this.state.grid.length; x++) {
        for (let y = 0; y < this.state.grid[x].length; y++) {
          if (this.state.grid[x][y]) {
            this.state.grid[x][y].remove();
          }
        }
      }
    }

    // Reset state
    const initialX = Math.floor(this.numColumns / 2) - 1;
    const initialY = Math.floor(this.numRows / 2) - 1;
    const initialRect = this.getRect(initialX, initialY);
    
    this.state = {
      currentBlock: null,
      curX: initialX,
      curY: initialY,
      currentBlockLeft: initialRect.left,
      currentBlockTop: initialRect.top,
      grid: Array(this.numColumns).fill().map(() => Array(this.numRows).fill(null)),
      constraints: Array(this.numColumns).fill().map(() => Array(this.numRows).fill(null)),
      blockHistory: [],
      gameOver: false,
      showCursor: true,
    };

    this.completedTokensTop = 20;

    // Decide on a reader
    this.reader = await new WikiSelect().getReader();
    console.log('Loaded Reader:', this.reader);

    if (this.stream) {
      this.stream.clear();
    }

    
    // Initialize the text stream
    this.streamLength = 20;
    this.stream = new TextStreamEntity(this, 
      new TextStream(this.streamLength, this.reader),
      new ClassicDomTextStreamComponent(this)
    );

    // Set up controls and event listeners
    await this.setupControls(options);
    
    // Only do these once on first initialization
    if (!this.firstInitDone) {
      await this.initializeSounds();
      
      // Start the game loop
      setInterval(() => {
        this.tick();
      }, this.tickTime);
      
      this.firstInitDone = true;
    }

    this.drawBackground();
    this.nextBlockUp();
  }

  getColumnWidth(x) {
    return this.columnWidths[x];
  }


  getColumnLeft(x) {
    return this.gridStartX + this.columnWidths.slice(0, x).reduce((sum, width) => sum + width, 0);
  }

  getRowTop(y) {
    return this.gridStartY + this.rowHeights.slice(0, y).reduce((sum, height) => sum + height, 0);
  }

  getRowHeight(y) {
    return this.rowHeights[y];
  }

  getRect(x, y) {
    return {
      width: this.getColumnWidth(x),
      height: this.getRowHeight(y),
      left: this.getColumnLeft(x),
      top: this.getRowTop(y),
      right: this.getColumnLeft(x + 1), // we can optimize this
      bottom: this.getRowTop(y + 1),
    }
  }

  async setupControls(options) {
    const controlSelect = new ControlSelect(this);
    const controls = await controlSelect.getControls();
    this.controller = controls.controller;
    this.keyboardMapper = controls.keyboardMapper;
    this.midiMapper = controls.midiMapper;

    // Submit button
    const submitBtn = document.getElementById('submit-poem');
    submitBtn.addEventListener('click', () => {
      this.endGame();
      submitBtn.blur();
    });

    // End game modal controls
    const endGameModal = document.getElementById('end-game-modal');
    const closeEndGameBtn = document.getElementById('close-end-game-modal');
    const closeEndGameBtnFooter = document.getElementById('close-end-game-btn');
    const newGameFromEndBtn = document.getElementById('new-game-from-end');

    // Close end game modal handlers
    closeEndGameBtn.addEventListener('click', () => {
      endGameModal.style.display = 'none';
      closeEndGameBtn.blur();
    });

    closeEndGameBtnFooter.addEventListener('click', () => {
      endGameModal.style.display = 'none';
      closeEndGameBtnFooter.blur();
    });

    // Start new game from end game modal
    newGameFromEndBtn.addEventListener('click', () => {
      const newGameModal = document.getElementById('new-game-modal');
      endGameModal.style.display = 'none';
      newGameModal.style.display = 'flex';
      newGameFromEndBtn.blur();
    });

    // Close end game modal when clicking outside
    endGameModal.addEventListener('click', (e) => {
      if (e.target === endGameModal) {
        endGameModal.style.display = 'none';
      }
    });

    // Delete ratio control
    const deleteRatioSelect = document.getElementById('delete-ratio');
    deleteRatioSelect.addEventListener('change', (e) => {
      this.probabilities.delete = parseFloat(e.target.value);
      console.log('New delete probability:', this.probabilities.delete);
      e.target.blur(); // Remove focus after selection
    });
    this.probabilities.delete = parseFloat(deleteRatioSelect.value);

    // Color by control
    const colorBySelect = document.getElementById('color-by');
    colorBySelect.addEventListener('change', (e) => {
      this.colorBy = e.target.value;
      e.target.blur(); // Remove focus after selection
    });
    this.colorBy = colorBySelect.value;
    console.log('New color by:', this.colorBy);

    // // Instructions modal controls
    // const instructionsModal = document.getElementById('instructions-modal');
    // const closeInstructionsBtn = document.getElementById('close-instructions-modal');
    // const closeInstructionsBtnFooter = document.getElementById('close-instructions-btn');

    // // Close instructions modal handlers
    // closeInstructionsBtn.addEventListener('click', () => {
    //   instructionsModal.style.display = 'none';
    //   closeInstructionsBtn.blur();
    // });

    // closeInstructionsBtnFooter.addEventListener('click', () => {
    //   instructionsModal.style.display = 'none';
    //   closeInstructionsBtnFooter.blur();
    // });

    // // Close instructions modal when clicking outside
    // instructionsModal.addEventListener('click', (e) => {
    //   if (e.target === instructionsModal) {
    //     instructionsModal.style.display = 'none';
    //   }
    // });

    // Options modal controls
    const optionsBtn = document.getElementById('options-btn');
    const optionsModal = document.getElementById('options-modal');
    const closeOptionsBtn = document.getElementById('close-options-modal');
    const closeOptionsBtnFooter = document.getElementById('close-options-btn');

    // Open options modal
    optionsBtn.addEventListener('click', () => {
      optionsModal.style.display = 'flex';
      optionsBtn.blur();
      this.populateMidiOptions();
    });

    // Close options modal handlers
    closeOptionsBtn.addEventListener('click', () => {
      optionsModal.style.display = 'none';
      closeOptionsBtn.blur();
    });

    closeOptionsBtnFooter.addEventListener('click', () => {
      optionsModal.style.display = 'none';
      closeOptionsBtnFooter.blur();
    });

    // Close options modal when clicking outside
    optionsModal.addEventListener('click', (e) => {
      if (e.target === optionsModal) {
        optionsModal.style.display = 'none';
      }
    });

    // Save MIDI options
    const saveMidiOptionsBtn = document.getElementById('save-midi-options');
    saveMidiOptionsBtn.addEventListener('click', () => {
      this.saveMidiOptions();
      saveMidiOptionsBtn.blur();
    });

    // New Game modal controls
    const newGameBtn = document.getElementById('new-game-btn');
    const newGameModal = document.getElementById('new-game-modal');
    const closeNewGameBtn = document.getElementById('close-new-game-modal');
    const closeNewGameBtnFooter = document.getElementById('close-new-game-btn');
    const startNewGameBtn = document.getElementById('start-new-game-btn');

    // Open new game modal
    newGameBtn.addEventListener('click', () => {
      newGameModal.style.display = 'flex';
      newGameBtn.blur();
    });

    // Close new game modal handlers
    closeNewGameBtn.addEventListener('click', () => {
      newGameModal.style.display = 'none';
      closeNewGameBtn.blur();
    });

    closeNewGameBtnFooter.addEventListener('click', () => {
      newGameModal.style.display = 'none';
      closeNewGameBtnFooter.blur();
    });

    // Close new game modal when clicking outside
    newGameModal.addEventListener('click', (e) => {
      if (e.target === newGameModal) {
        newGameModal.style.display = 'none';
      }
    });

    // Start new game handler
    startNewGameBtn.addEventListener('click', async () => {
      const numColumns = parseInt(document.getElementById('new-game-columns').value);
      const numRows = parseInt(document.getElementById('new-game-rows').value);

      newGameModal.style.display = 'none';
      document.getElementById('end-game-modal').style.display = 'none';
      
      await this.initialize({
        numColumns,
        numRows
      });
      
      startNewGameBtn.blur();
    });

    // Close any modal with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        // if (instructionsModal.style.display === 'flex') {
        //   instructionsModal.style.display = 'none';
        // }
        if (optionsModal.style.display === 'flex') {
          optionsModal.style.display = 'none';
        }
        if (newGameModal.style.display === 'flex') {
          newGameModal.style.display = 'none';
        }
      }
    });
  }

  isGridFull() {
    for (let x = 0; x < this.numColumns; x++) {
      for (let y = 0; y < this.numRows; y++) {
        if (this.state.grid[x][y] === null) {
          return false;
        }
      }
    }
    return true;
  }

  updateSubmitButtonVisibility() {
    const submitBtn = document.getElementById('submit-poem');
    submitBtn.style.display = 'block';
  }

  getCompletedPoemText() {
    const textContent = this.state.grid.map(row => 
      row.map(cell => getBlockText(cell)).join(' ')).join('\n');
    return textContent.trim();
  }

  endGame() {
    // Prevent multiple end game calls
    if (this.state.gameOver) return;
    
    // Get the poem text
    const poemText = this.getCompletedPoemText();
    
    // Show the end game modal
    const endGameModal = document.getElementById('end-game-modal');
    const finalPoemDiv = document.getElementById('final-poem');
    
    finalPoemDiv.textContent = poemText || 'Your poem is complete.';
    endGameModal.style.display = 'flex';

    // Stop the game
    if (this.state.currentBlock) {
      this.state.currentBlock.remove();
      this.state.currentBlock = null;
    }

    // Mark game as over
    this.state.gameOver = true;

    // Hide the submit button
    const submitBtn = document.getElementById('submit-poem');
    submitBtn.style.display = 'none';

    // TODO: In the future, we'll send the poem to the leaderboard here
  }

  async initializeSounds() {
    await soundManager.initialize();
  }

  drawCursor() {
    let elt;
    let {curX: x, curY: y} = this.state;

    // get it or create it 
    elt = document.querySelector('.current-highlight');
    if (!elt) {
      elt = document.createElement('div');
      elt.classList.add('current-highlight');
      document.body.appendChild(elt);
    }

    let colColor;

    // if (this.state.currentBlock == null) {
    //   colColor = 'transparent';
    // } else 
    
    if ( this.state.currentBlock.classList.contains('delete')) {
      colColor = DELETE_COLOR;
    } else if (this.state.currentBlock.classList.contains('constraint')) {
      colColor = this.state.currentBlock.style.getPropertyValue('--data-color');
    }
    else {
      colColor = 'var(--highlight)';
    }

    elt.style.setProperty('--col-color', colColor);

    // draw the column
    elt.style.left = this.state.currentBlockLeft + 'px';
    elt.style.top = this.state.currentBlockTop + 'px';
    elt.style.width = this.columnWidths[x] + 'px';
    elt.style.height = this.rowHeights[y] + 'px';

    if (this.state.showCursor) {
      elt.style.scale = 1;
    } else {
      elt.style.scale = 0;
    }
  }

  drawBackground() {
    let elt = singleton('background');
    elt.style.top = this.gridStartY + 'px';
    elt.style.left = this.gridStartX + 'px';
    elt.style.width = this.gridWidth + 'px';
    elt.style.height = this.gridHeight + 'px';
  }

  moveCurrent(dx, dy) {
    this.state.curX += dx;
    this.state.curY += dy;
    
    if (this.state.curX < 0) {
      this.state.curX = this.numColumns - 1;
    } else if (this.state.curX > this.numColumns - 1) {
      this.state.curX = 0;
    }

    if (this.state.curY < 0) {
      this.state.curY = this.numRows - 1;
    } else if (this.state.curY > this.numRows - 1) {
      this.state.curY = 0;
    }

    let {left, top} = this.getRect(this.state.curX, this.state.curY);
    this.state.currentBlockLeft = left;
    this.state.currentBlockTop = top;
  }

  drawMove() {
    let {currentBlockLeft: left, currentBlockTop: top } = this.state;
    moveTo(this.state.currentBlock, left, top, this.arrowSpeed, false, 'ease-in-out');
    this.state.showCursor = true;
    this.drawCursor();
    this.onStart(); // mark that the player has done something
  }

  tick() {
    if (this.state.gameOver) return;
    
    if (this.state.currentBlock) {
      // this.dropToken(this.state.currentToken);
    } else {
      // Check if grid is full before generating next block
      // if (this.isGridFull()) {
      //   this.endGame();
      //   return;
      // }
      // this.nextBlockUp();
      // this.printState();
    }
  }

  printState() {
    console.log("state", this.state)
  }

  /**
   * Update the current block's color based on a MIDI note
   * @param {number} midiNote - MIDI note number (0-127)
   */
  updateTokenColors(midiNote) {
    if (!this.state.currentBlock) {
      return;
    }
    
    const hue = noteToHue(midiNote);
    updateBlockColor(this.state.currentBlock, hue);

    this.stream.updateColor(hue);
  }

  generateNextBlockData() {
    let isBeginning = this.state.blockHistory.length < this.numInitialConstraints;
    let blockType =  isBeginning ? 'constraint' : roll(this.probabilities);

    let tokenData;
    switch (blockType) {
      case "delete":
        tokenData = { text: '←', type: 'delete' };
        break;
      case "constraint":
        console.error("generateNextBlock: constraint is not supported");
        tokenData = this.corpus.getNextConstraint();
        break;
      case "token":
        tokenData = this.reader.read(); // get the next token from the reader
        break;
      case "null": case null:
        throw new Error("generateNextBlock: type is null");
    }

    this.state.blockHistory.push(tokenData);
    return tokenData;
  }

  nextBlockUp() {
    let next =  this.stream.pop();
    this.state.currentBlock = next?.block;
    if (this.state.currentBlock) {
      this.state.currentBlock.classList.add('current-token');

      moveTo(
        this.state.currentBlock,
        this.state.currentBlockLeft,
        this.state.currentBlockTop,
        this.dropTimePerBox
      )
    }
  }

  removeOriginalTokens(completedTokens) {
    completedTokens.forEach(({ token }) => {
      token.remove();
    });
  }

  updateConstraintVisuals(completedConstraints) {
    for (let i = 0; i < completedConstraints.completed.length; i++) {
      if (completedConstraints.completed[i]) {
        this.state.constraints[i].classList.add('completed');
      } else {
        this.state.constraints[i].classList.remove('completed');
      }
    }
  }

  getConstraintValue(token) {
    return token ? token.getAttribute('data-constraint').toLowerCase() : null;
  }

  // Get the names of the current constraints
  targetConstraints() {
    return this.state.constraints.map(constraint => this.getConstraintValue(constraint));
  }

  // Check if the current constraints match the target constraints
  checkLineSatisfied(constraints, target) {
    return constraints.every((constraint, index) => this.checkConstraintSatisfied(constraint, target[index]));
  }

  checkConstraintSatisfied(actual, target) {

    if (actual == null) {
      return false;
    }

    if (target == 'word' || target == '') {
      return true;
    }

    return actual == target;
  }

  getCompletedConstraints() {
    let completed = [];
    for (let x = 0; x < this.numColumns; x++) {
      for (let y = 0; y < this.numRows; y++) {
        let block = this.state.grid[x][y];
        let constraint = this.state.constraints[x][y];

        if (block) {
          let actual = this.getConstraintValue(block)
          let target = this.getConstraintValue(constraint)
          completed.push(this.checkConstraintSatisfied(actual, target));
        }
        if (block && constraint) {
          constraint.classList.add('filled');
        } else if (constraint) {
          constraint.classList.remove('filled');
        }
      }
    }
    return completed;
  }

  getCompletedLinesFromConstraints(constraintState) {
    let completedLines = [];

    let lineCompleted = this.checkLineSatisfied(constraintState.actual, constraintState.target);

    if (lineCompleted) {
      completedLines.push(this.numRows - 1);
    }
    return completedLines;
  }


  getFullLines() {
    let completedLines = [];
    for (let y = 0; y < this.numRows; y++) {
      let complete = true;
      for (let x = 0; x < this.numColumns; x++) {
        if (this.state.grid[x][y] == null) {
          complete = false;
          break;
        }
      }
      if (complete) {
        completedLines.push(y);
      }
    }
    return completedLines;
  }
  
  updateGrid(element) {
    let {curX: x, curY: y} = this.state;
    this.delete(x, y);
    this.state.grid[x][y] = element;
  }

  addColToGrid(col) {
    let newWidth = 50;
    this.resizeColumn(col, newWidth);
    this.addColumn(col, newWidth);
    this.shrinkCurrentToken(newWidth);
    this.drop();
  }

  resizeColumn(col, width) {
    console.log(`Resizing column ${col} to width: ${width}`);
    this.columnWidths[col] = width;
    let height = this.getColumnHeight(0);
    for (let y = 0; y < this.numRows; y++) {
      let token = this.state.grid[col][y];
      if (token) {
        resizeToken(token, width, height);
        moveTo(token, this.getColumnLeft(col), token.offsetTop, this.dropTimePerBox);
      }
    }
  }

  resizeRow(row, height) {
    console.log(`Resizing row ${row} to height: ${height}`);
    this.rowHeights[row] = height;
    let width = this.getColumnWidth(0);

    for (let x = 0; x < this.numColumns; x++) {
      let token = this.state.grid[x][row];
      if (token) {
        resizeToken(token, width, height);
        moveTo(token, token.offsetLeft, this.getColumnTop(row), this.dropTimePerBox);
      }
    }
  }

  addColumn(col, width) {
    this.numColumns += 1;
    let newCol = Array(this.numRows).fill(null);
    this.state.grid.splice(col, 0, newCol);
    this.columnWidths.splice(col, 0, width);

    for (let y = 0; y < this.numRows; y++) {
      for (let x = col + 1; x < this.numColumns; x++) {
        let token = this.state.grid[x][y];
        if (token) {
          moveTo(token, this.getColumnLeft(x), token.offsetTop, this.dropTimePerBox);
        }
      }
    }
  }

  shrinkCurrentToken(width) {
    let elt = this.state.currentBlock;
    if (elt) {
      resizeToken(elt, elt.offsetWidth - width, elt.offsetHeight);
      moveTo(elt, elt.offsetLeft, elt.offsetTop, this.dropTimePerBox);
    }
  }

  applyConstraint(col, row) {

    if (this.state.constraints[col][row]) {
      this.state.constraints[col][row].remove();
    }
    this.state.constraints[col][row] = this.state.currentBlock;

  }

 
  delete(x, y) {
    let removed = null
    let token = this.state.grid[x][y];
    if (token) {
      removed = token.remove();
    }
    this.state.grid[x][y] = null;
    return removed;
  }

  collide(x) {
    for (let y = 0; y < this.numRows; y++) {
      if (this.state.grid[x][y] != null) {
        return [y - 1, this.state.grid[x][y]];
      }
    }
    return [this.numRows - 1, null];
  }

  bottomLine() {
    let bottom = [];
    for (let x = 0; x < this.numColumns; x++) {
      let token = this.state.grid[x][this.numRows - 1];
      bottom.push(token);
    }
    return bottom;
  }

  bottomTokens() {
    let bottom = this.bottomLine();
  }

  matches(bottomTokens) {
    let search = bottomTokens.map(token => token == '' ? '.' : token).join(' ');
    let match = this.corpus.doc.match(bottomTokens.join(' ')).terms().out('array');
    console.log({search, match})
  }

  /**
   * Populate the MIDI options in the options modal
   */
  populateMidiOptions() {
    if (!this.midiMapper) return;

    const MapperClass = this.midiMapper.constructor;
    const infoContainer = document.getElementById('midi-mapper-info');
    const optionsContainer = document.getElementById('midi-options-container');

    if (!infoContainer || !optionsContainer) return;

    // Show mapper name and description
    infoContainer.innerHTML = `
      <div style="padding: 10px; background: #f0f0f0; border-radius: 4px;">
        <strong>${MapperClass.name}</strong>
        <p style="margin: 5px 0 0 0; font-size: 0.9em;">${MapperClass.description}</p>
      </div>
    `;

    // Render options based on mapper's static options
    const optionsHtml = MapperClass.options.map(option => {
      if (option.type === 'range') {
        // Get current values from midiInterface settings
        const currentRange = this.midiMapper.midiInterface.settings[option.id] || option.defaults;
        
        return `
          <div style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: bold;">
              ${option.label}
            </label>
            <div style="display: flex; gap: 10px; align-items: center;">
              <div>
                <label for="midi-${option.id}-min" style="font-size: 0.85em;">Min:</label>
                <input type="number" id="midi-${option.id}-min" value="${currentRange[0]}" 
                       min="${option.min}" max="${option.max}" 
                       style="width: 60px; margin-left: 5px;">
              </div>
              <div>
                <label for="midi-${option.id}-max" style="font-size: 0.85em;">Max:</label>
                <input type="number" id="midi-${option.id}-max" value="${currentRange[1]}" 
                       min="${option.min}" max="${option.max}" 
                       style="width: 60px; margin-left: 5px;">
              </div>
            </div>
          </div>
        `;
      }
      return '';
    }).join('');

    optionsContainer.innerHTML = optionsHtml;
  }

  /**
   * Save the MIDI options from the modal
   */
  saveMidiOptions() {
    if (!this.midiMapper) return;

    const MapperClass = this.midiMapper.constructor;

    // Build new options from UI inputs
    const newOptions = {};
    MapperClass.options.forEach(option => {
      if (option.type === 'range') {
        const minValue = parseInt(document.getElementById(`midi-${option.id}-min`).value, 10);
        const maxValue = parseInt(document.getElementById(`midi-${option.id}-max`).value, 10);
        newOptions[option.id] = [minValue, maxValue];
      }
    });

    // Update the midiInterface settings
    Object.assign(this.midiMapper.midiInterface.settings, newOptions);

    console.log('MIDI settings updated:', newOptions);
    
    // Show feedback
    const btn = document.getElementById('save-midi-options');
    const originalText = btn.textContent;
    btn.textContent = 'Settings Applied!';
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  }
}


export let defaultCorpora = [
  // 'corpora/short/sacred_emily.txt',
  // 'corpora/short/love_breton.txt', 
  // 'corpora/short/less_time.txt', 
  // 'corpora/short/eis.txt',
  // 'corpora/books/tale_of_two_cities.txt',
  // 'corpora/short/eis_wiki.txt',
  // 'corpora/short/here.txt',
  'corpora/books/tale_of_two_cities_small.txt',
  'corpora/short/chapters/this_the_way_to_the_museyroom_finnegans_wake.txt',

  // uninteresting
  // 'corpora/short/art.txt', 
  // 'corpora/books/nadja.txt',
  // 'corpora/short/harry_potter_ch1.txt', 
];
// let [file1, file2] = defaultCorpora.sort(() => 0.5 - Math.random()).slice(0, 2);
// let defaultCorpus = file1; // Use first file as default

export function getNewCorpus() {
  let order = defaultCorpora.sort(() => 0.5 - Math.random());
  return order[0];
}

export async function getNewCorpusText(filename) {
  const assetsFolder = '/editors/assets';
  const filePath = `${assetsFolder}/${filename}`;
  const response = await fetch(filePath);
  return response.text();
}
