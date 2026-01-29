import { SettingsMixin } from '/editors/vault/01-23-2026/src/performances/SettingsMixin.js';
import { CustomTextCorpus } from '/editors/vault/01-23-2026/src/corpus/CustomTextCorpus.js';
import { MultiTextReader } from '/editors/vault/01-23-2026/src/readers/MultiTextReader.js';
import { TextStream } from '/editors/vault/01-23-2026/src/streams/TextStream.js';
import { TextStreamEntity } from '/editors/vault/01-23-2026/src/streams/TextStreamEntity.js';
import { WordTailTextStreamComponent } from './WordTailTextStreamComponent.js';
import { moveTo, getScaleModifier, createBlockAt } from './block.js';

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
function resizeToken(element, width, height) {
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

export class DropperPerformance extends SettingsMixin(class {}) {
  constructor() {
    super();

    this.corpora = null;
    this.reader = null;
    this.wordTail = null; // The TextSrteamEntity entity coordinating stream and visuals
    this.colorBy = 'source'; // [source, pos] Default color by part of speech

    this.probabilities = {
      delete: 0.25,
      constraint: 0.2,
      token: -1,
    }
    this.numInitialConstraints = 0;

    // Timing properties
    this.tickTime = 100; // ms
    this.dropTimePerBox = 50; // ms
    this.completionTime = 1000; // ms
    this.arrowSpeed = 170; // ms

    this.completedMode = 'constraint';
    this.wordTailLength = 20;
  }

  initializeAnyConstraints() {
    // Create 'word' constraint blocks for each column
    for (let x = 0; x <this.params.numColumns; x++) {
      // Create an 'any' constraint block with empty text
      const anyBlock = {
        text: 'word',
        type: 'constraint',
        constraint: {
          type: 'word',
          value: 'word'
        }
      };

      // Create the block element
      const blockElement = createBlockAt(anyBlock, this.getColumnLeft(x), this.getColumnTop(this.params.numRows - 1), this.columnWidths[x], this.columnHeights[0], this.colorBy);
      
      // Set it as a constraint for this column
      if (this.state.constraints[x]) {
        this.state.constraints[x].remove();
      }
      this.state.constraints[x] = blockElement;
    }
  }

  async initialize(params = {}) {
    this.params = { 
      sourceTexts: null, // defaults to sourceText over defaultCorpus if set
      defaultCorpus: 'corpora/short/eis.txt',
      numColumns: 6,
      numRows: 12,

      // Grid positioning
      gridStartX: 100,
      gridStartY: 100,
      gridEndGap: 40,

      ...params
    }

    this.settings = [
      { name: 'numColumns', type: 'number', description: 'Number of columns' },
      { name: 'numRows', type: 'number', description: 'Number of rows' },
    ];

    this.parent = document.querySelector("#game");

    // Grid positioning constants
    this.params.gridWidth = window.innerWidth - this.params.gridStartX;
    this.params.gridHeight = window.innerHeight - this.params.gridStartY - this.params.gridEndGap;

    // Calculate cell sizes
    this.params.cellHeight = this.params.gridHeight / this.params.numRows;
    this.params.cellWidth = this.params.gridWidth / this.params.numColumns;

    this.columnWidths = Array(this.params.numColumns).fill(this.params.cellWidth);
    this.columnHeights = Array(this.params.numRows).fill(this.params.cellHeight);

    // Token origin
    this.tokenOrigin = {
      left: this.params.gridStartX,
      top: this.params.gridStartY
    };

    // Clear current game state if it exists
    if (this.state) {
      if (this.state.currentBlock) {
        this.state.currentBlock.remove();
      }
      
      // Clear token stream if it exists
      if (this.wordTail) {
        this.wordTail.clear();
      }

      if (this.arrowKeysListener) {
        document.removeEventListener('keydown', this.arrowKeysListener);
      }
      
      // Clear grid
      for (let x = 0; x < this.state.grid.length; x++) {
        for (let y = 0; y < this.state.grid[x].length; y++) {
          if (this.state.grid[x][y]) {
            this.state.grid[x][y].remove();
          }
        }
      }

      // Clear constraints
      this.state.constraints.forEach(constraint => {
        if (constraint) {
          constraint.remove();
        }
      });
    }

    this.completedTokensContainer = document.getElementById('completed-container');
    if (this.completedTokensContainer) {
      this.completedTokensContainer.innerHTML = '';
    }

    // Reset state
    this.state = {
      currentBlock: null,
      curX: 0,
      curY: 0,
      currentBlockLeft: this.params.gridStartX,
      currentBlockTop: this.params.gridStartY,
      grid: Array(this.params.numColumns).fill().map(() => Array(this.params.numRows).fill(null)),
      constraints: Array(this.params.numColumns).fill(null),
      blockHistory: [],
      gameOver: false
    };

    this.corpora = await this.initializeCorpora();

    if (this.wordTail) { this.wordTail.clear(); }

    console.log('corpora', this.corpora);
    // Initialize reader
    this.reader = new MultiTextReader(this.corpora);

    // Initialize token stream and visual component (wordTail)
    let tokenStream = new TextStream(this.wordTailLength, this.reader);
    const streamComponent = new WordTailTextStreamComponent(this, {
      to: this.tokenOrigin,
      blockWidth: this.params.cellWidth,
      blockHeight: this.params.cellHeight,
    });
    // an 'Entity' is a wrapper holding the token stream (the words) and component (visual representation)
    this.wordTail = new TextStreamEntity(this, tokenStream, streamComponent);

    // Set up controls and event listeners (only on first initialization)
    if (!this.params.isReset) {
      this.watchArrowKeys();
      this.watchSwipes();
      await this.initializeSounds();
      
      // Start the game loop
      setInterval(() => {
        this.tick();
      }, this.tickTime);
    }

    // If initialState is provided, restore from it
    if (this.params.initialState) {
      this.fromState(this.params.initialState);
    }

    // Initialize constraints
    this.initializeAnyConstraints();
  }

  async initializeCorpora() {
    let corpora = [];
    if (this.params.sourceTexts) {
      for (let sourceText of this.params.sourceTexts) {
        console.log('sourceText', sourceText);
        let corpus = sourceText.kind === 'corpusFile' ?
          await new CustomTextCorpus().setTextFromFile(sourceText.text) :
          new CustomTextCorpus().setCustomText(sourceText.text, sourceText.name);
        if (corpus) { corpora.push(corpus); }
      }
    } else if (this.params.corpusFile) {
      let corpus = new CustomTextCorpus();
      await corpus.setTextFromFile(this.params.corpusFile);
      corpora.push(corpus);
    } else {
      let corpus = new CustomTextCorpus();
      await corpus.loadTextsFromJSON();
      await corpus.loadRandomText();
      corpora.push(corpus);
    }
    return corpora;
  }

  onSettingChanged(name, value, oldValue) {
    console.log('onSettingChanged', name, value, oldValue);
    if (name === 'numColumns') {
        this.params.numColumns = value;
    } else if (name === 'numRows') {
      this.params.numRows = value;
    }
    
    this.initialize(this.params);
  }

  getColumnWidth(x) {
    return this.columnWidths[x];
  }

  getColumnHeight(y) {
    return this.columnHeights[y];
  }

  getColumnLeft(x) {
    return this.params.gridStartX + this.columnWidths.slice(0, x).reduce((sum, width) => sum + width, 0);
  }

  getColumnTop(y) {
    return this.params.gridStartY + this.columnHeights.slice(0, y).reduce((sum, height) => sum + height, 0);
  }

  getColumnRect(x, y) {
    return {
      width: this.getColumnWidth(x),
      height: this.getColumnHeight(y),
      left: this.getColumnLeft(x),
      top: this.getColumnTop(y),
      right: this.getColumnLeft(x + 1), // we can optimize this
      bottom: this.getColumnTop(y + 1),
    }
  }
  showInstructions() {
    const modal = document.getElementById('instructions-modal');
    modal.style.display = 'flex';
  }

  isGridFull() {
    for (let x = 0; x <this.params.numColumns; x++) {
      for (let y = 0; y < this.params.numRows; y++) {
        if (this.state.grid[x][y] === null) {
          return false;
        }
      }
    }
    return true;
  }

  updateSubmitButtonVisibility() {
    const submitBtn = document.getElementById('submit');
    submitBtn.style.display = 'flex !important';
  }

  getCompletedPoemText() {
    if (!this.completedTokensContainer) return '';
    
    // Get all text nodes from the completed container
    const textContent = Array.from(this.completedTokensContainer.childNodes)
      .map(node => {
        if (node.nodeType === Node.TEXT_NODE) return node.textContent;
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName.toLowerCase() === 'br') return '\n';
          return node.textContent.toUpperCase();
        }
        return '';
      })
      .join('');

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
    
    finalPoemDiv.textContent = poemText || 'You ran out of space and didn\'t finish your poem!';
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

  onStart() {
    const controlIcons = document.getElementById('control-icons');
    if (controlIcons) {
      controlIcons.classList.add('hidden');
    }
  }

  onMove() {

    this.onStart();

    let newLeft = this.getColumnRect(this.state.curX, 0).left;
    let newTop  = this.state.currentBlock.offsetTop;

    this.state.currentBlockLeft = newLeft;

    this.drawColumnIndicator(this.state.curX);

    // resizeToken(this.state.currentBlock, this.columnWidths[this.state.curX], this.columnHeights[0]);
    moveTo(this.state.currentBlock, newLeft, newTop, this.arrowSpeed, false, 'ease-in-out');
    this.moveWordTail({left: newLeft, top: newTop});
  }


  moveRight() {
    if (this.state.curX ==this.params.numColumns - 1) {
      this.state.curX = 0;
    } else {
      this.state.curX += 1;
    }

    this.onMove();

  }

  moveLeft() {
    if (this.state.curX == 0) {
      this.state.curX =this.params.numColumns - 1;
    } else {
      this.state.curX -= 1;
    }
    
    this.onMove();
  }

  cycleColumn(direction) {
    let column = this.state.curX;

    // Find uppermost filled cell
    let upperMostFilledColInRow = this.params.numRows - 1;
    for (let y = 0; y < this.params.numRows; y++) {
      if (this.state.grid[column][y] != null) {
        upperMostFilledColInRow = y;
        break;
      }
    }

    let numInCol = this.params.numRows - upperMostFilledColInRow;
    if (numInCol <= 1) return; // nothing to cycle

    // Collect tokens
    let tokens = [];
    for (let i = 0; i < numInCol; i++) {
      tokens.push(this.state.grid[column][upperMostFilledColInRow + i]);
    }

    // Rotate based on direction (-1 = up, 1 = down)
    if (direction === -1) {
      tokens.push(tokens.shift()); // move first to end
    } else {
      tokens.unshift(tokens.pop()); // move last to beginning
    }

    // Update grid and animate
    tokens.forEach((token, i) => {
      let oldY = upperMostFilledColInRow + ((i - direction + numInCol) % numInCol);
      let newY = upperMostFilledColInRow + i;
      this.state.grid[column][newY] = token;
      moveTo(token, token.offsetLeft, this.getColumnTop(newY), this.dropTimePerBox * Math.abs(newY - oldY), 'ease-in-out');
    });
  }

  /**
   * Drop a block (token) into the grid
   * @param {HTMLElement} element - the block to drop
   */
  dropBlock() {
    let element = this.state.currentBlock;

    if (element == null) {
      console.error("Attempting to drop null element", element)
    }

    // Remove current-token class and markup
    element.classList.remove('current-token');
    const markup = element.querySelector('.current-markup');
    if (markup) markup.remove();

    let didDrop = false;
    let dropTime = 0;

    // drop the block / apply animation
    if (element.classList.contains('delete')) {
      this.applyDelete(this.state.curX);
      this.state.currentBlock.remove();
      didDrop = true;
    } else if (element.classList.contains('constraint')) {
      this.applyConstraint(this.state.curX);
      didDrop = true;
    } else { // a token
      [didDrop, dropTime] = this._dropAndUpdateGrid(element);
    }

    if (!didDrop) {
      return;
    }

    // reset the token
    if (this.state.currentBlock && didDrop) {
      this.state.currentBlock = null; 
    }

    this.nextBlockUp();
    let loc = {left: this.state.currentBlockLeft, top: this.state.currentBlockTop};
    // // moveTo(this.state.currentBlock, loc.left, loc.top, this.arrowSpeed, false, 'ease-in-out');
    this.moveWordTail(loc);

    // Check for completed lines
    let constraintCompletedState = this.getCompletedConstraints();
    let completedLines = this.getCompletedLines(constraintCompletedState);

    // Update the visuals - don't show the ::after for completed 
    this.updateConstraintVisuals(constraintCompletedState);

    if (completedLines && completedLines.length > 0) {
      // Play line complete sound
      setTimeout(() => {
        this.moveCompletedLine(completedLines);
        soundManager.playSound('woof');

      }, dropTime);
    }
  }

  // Control listener - eventually could use our controller logic
  watchArrowKeys() {
    this.arrowKeysListener = (event) => {
      if (event.key === 'ArrowRight') {
        this.moveRight();
      } else if (event.key === 'ArrowLeft') {
        this.moveLeft();
      } else if (event.key === ' ') {
        this.dropBlock();
      } else if (event.key === 'ArrowUp') {
        this.cycleColumn(-1)
      } else if (event.key === 'ArrowDown') {
        this.cycleColumn(1);
      }
    }

    document.addEventListener('keydown', this.arrowKeysListener);
  }

  watchSwipes() {
    let touchStartX = 0;
    let touchStartY = 0;
    const swipeThreshold = 50; // minimum distance for a swipe

    document.addEventListener('touchstart', (event) => {
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
    });

    document.addEventListener('touchend', (event) => {
      if (!this.state.currentBlock) return;

      const touchEndX = event.changedTouches[0].clientX;
      const touchEndY = event.changedTouches[0].clientY;
      
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      
      // Check if it's a horizontal swipe (more horizontal than vertical movement)
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > swipeThreshold) {
        if (deltaX > 0) {
          this.moveRight();
        } else {
          this.moveLeft();
        }
      } else if (Math.abs(deltaY) > swipeThreshold && deltaY > 0) {
        this.dropBlock();
      }
    });
  }

  tick() {
    if (this.state.gameOver) return;
    
    if (this.state.currentBlock) {
      // this.dropToken(this.state.currentToken);
    } else {
      // Check if grid is full before generating next block
      if (this.isGridFull()) {
        this.endGame();
        return;
      }
      this.nextBlockUp();
      this.printState();
    }
  }

  printState() {
    let line = this.bottomLine();
    let tokens = line.map(token => token == null ? '' : token.textContent);
    // console.log("Current line:", tokens);

    let constraints =  this.targetConstraints();
    let constraintValues = this.getConstraintsFromWordsInRow(this.params.numRows - 1);

    // console.log("Line constraints", constraintValues);
    // console.log("Target constraints:", constraints);
  }

  nextBlockUp() {
    // Pop a token from the stream and get its block representation
    const { token, block } = this.wordTail.pop();

    if (!token || !block) {
      console.error("nextBlockUp(): failed to get token/block from stream");
      return;
    }

    // Set as current block
    this.state.curY = 0;
    this.state.currentBlock = block;
    this.state.currentBlock.classList.add('current-token');

    this.drawColumnIndicator(this.state.curX);

    // Move the new current block
    moveTo(block, this.state.currentBlockLeft, this.state.currentBlockTop, this.arrowSpeed, false, 'ease-in-out');
  }

  moveWordTail(to) {
    this.wordTail.component.move(to);
  }

  drawColumnIndicator(col) {
    let columnElt;
    // get it or create it 
    columnElt = document.querySelector('.column');
    if (!columnElt) {
      columnElt = document.createElement('div');
      columnElt.classList.add('column');
      this.parent.appendChild(columnElt);
    }

    let colColor;
    if (this.state.currentBlock && this.state.currentBlock.classList.contains('delete')) {
      colColor = DELETE_COLOR;
    } else {
      colColor =  "#ff9d14";
    }

    columnElt.style.setProperty('--col-color', colColor);

    // draw the column
    columnElt.style.left = this.getColumnLeft(col) + 'px';
    columnElt.style.top = '0px';
    columnElt.style.width = this.columnWidths[col] + 'px';
    // bottom of the screen
    columnElt.style.height = '1000px';
  }

  moveCompletedLine(completedLines) {
    // Sort completed lines from bottom to top to avoid conflicts
    completedLines.sort((a, b) => b - a);
    
    for (let row of completedLines) {
      let completedTokens = this.collectCompletedTokens(row);
      this.removeCompletedTokensFromGrid(row);
      this.shiftTokensDown(row);
      this.animateCompletedTokens(completedTokens);
    }

    // Show submit button when a line is completed
    if (completedLines && completedLines.length > 0) {
      this.updateSubmitButtonVisibility();
    }
  }

  collectCompletedTokens(row) {
    let completedTokens = [];
    for (let x = 0; x <this.params.numColumns; x++) {
      let token = this.state.grid[x][row];
      if (token) {
        completedTokens.push({ token, x, y: row });
      }
    }
    // remove the _ and replace with spaces
    completedTokens = completedTokens.map((token) => {
      if (token.token.textContent == '_') {
        token.token.textContent = ' ';
      }
      return token;
    });
    

    return completedTokens;
  }

  removeCompletedTokensFromGrid(row) {
    for (let x = 0; x <this.params.numColumns; x++) {
      this.state.grid[x][row] = null;
    }
  }

  shiftTokensDown(row) {
    for (let y = row - 1; y >= 0; y--) {
      for (let x = 0; x <this.params.numColumns; x++) {
        let token = this.state.grid[x][y];
        if (token) {
          let newY = y + 1;
          this.state.grid[x][newY] = token;
          this.state.grid[x][y] = null;
          
          let newTop = this.getColumnTop(newY);
          moveTo(token, token.offsetLeft, newTop, this.dropTimePerBox);
        }
      }
    }
  }

  animateCompletedTokens(completedTokens) {

    const completedWrapper = document.getElementById('completed-wrapper');

    const submitContainer = document.getElementById('submit');
    const submitButton = document.getElementById('submit-button');
    if (completedWrapper && submitContainer && submitButton) {
      completedWrapper.appendChild(submitContainer);
      submitButton.classList.add('visible');
    }

    // Create permanent tokens and measure their natural positions
    const permanentTokens = this.createCompleteTokenRender(completedTokens);
    const tokenPositions = permanentTokens.map(token => {
      const rect = token.getBoundingClientRect();
      return { left: rect.left, top: rect.top };
    });
    
    // Hide the permanent tokens
    permanentTokens.forEach(token => token.style.opacity = '0');
    
    // Animate original tokens to those positions
    completedTokens.forEach(({ token }, index) => {
      // token.classList.remove('block');
      // token.classList.add('word');
      const position = tokenPositions[index];
      // change the size to half what they are
      resizeToken(token, token.offsetWidth / 2, token.offsetHeight / 2);

      moveTo(token, position.left, position.top, this.completionTime, true, 'ease-out');
    });

    // Show the permanent tokens and remove originals after animation
    setTimeout(() => {
      permanentTokens.forEach(token => token.style.opacity = '1');
      this.removeOriginalTokens(completedTokens);
    }, this.completionTime);

  }

  createCompleteTokenRender(completedTokens) {
    const permanentTokens = [];
    completedTokens.forEach(({ token }, index) => {
      const newToken = document.createElement('div');
      newToken.textContent = token.textContent;
      newToken.classList.add('inline-word');

      newToken.style.color = token?.style?.getPropertyValue('--data-color') || '#d09500';
      this.completedTokensContainer.appendChild(newToken);
      permanentTokens.push(newToken);
      
      // Add a space after each token except the last one
      if (index < completedTokens.length - 1) {
        const space = document.createElement('span');
        space.textContent = ' ';
        this.completedTokensContainer.appendChild(space);
      }
    });
    
    // Add a line break after each completed row
    const lineBreak = document.createElement('br');
    this.completedTokensContainer.appendChild(lineBreak);
    
    return permanentTokens;
  }

  removeOriginalTokens(completedTokens) {
    completedTokens.forEach(({ token }) => {
      token.remove();
    });
  }

  getCompletedLines(actualConstraints, targetConstraints) {
    if (this.completedMode == 'full') {
      return this.getFullLines();
    } else if (this.completedMode == 'constraint') {
      return this.getCompletedLinesFromConstraints(actualConstraints, targetConstraints);
    }

    return [];
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

  getConstraintsFromWordsInRow(row) {
    let constraints = [];
    for (let x = 0; x <this.params.numColumns; x++) {
      let token = this.state.grid[x][row];
      constraints.push(this.getConstraintValue(token));
    }
    return constraints;
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
    let y = this.params.numRows - 1;
    let actual = this.getConstraintsFromWordsInRow(y);
    let target = this.targetConstraints();
    let completed = [];
    for (let i = 0; i < target.length; i++) {
      completed.push(this.checkConstraintSatisfied(actual[i], target[i]));
    }


    return {actual, target, completed};
  }

  getCompletedLinesFromConstraints(constraintState) {
    let completedLines = [];

    let lineCompleted = this.checkLineSatisfied(constraintState.actual, constraintState.target);

    if (lineCompleted) {
      completedLines.push(this.params.numRows - 1);
    }
    return completedLines;
  }


  getFullLines() {
    let completedLines = [];
    for (let y = 0; y < this.params.numRows; y++) {
      let complete = true;
      for (let x = 0; x <this.params.numColumns; x++) {
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
  
  _dropAndUpdateGrid(element) {
    let x = this.state.curX;
    let y = this.collide(x);
    if (y < 1) {
      console.warn('no space to drop', x, y)
      return [false, 0];
    }

    let newTop = this.getColumnTop(y);
    let dropTime = this.dropTimePerBox * Math.abs(element.offsetTop - newTop) / this.getColumnHeight(0);

    // move the token to the bottom using a quadratic gravity
    let quadratic = "cubic-bezier(0.5, 1, 0.89, 1)"
    moveTo(element, this.state.currentBlockLeft, newTop, dropTime, false, quadratic);
    this.state.grid[x][y] = element;

    // play a sound on drop
    setTimeout(() => {
      soundManager.playSound('rain/rain1');
    }, dropTime);

    return [true, dropTime];
  }

  addColToGrid(col) {
    let newWidth = 50;
    this.resizeColumn(col, newWidth);
    this.addColumn(col, newWidth);
    this.shrinkCurrentToken(newWidth);
    this.dropBlock();
  }

  resizeColumn(col, width) {
    console.log(`Resizing column ${col} to width: ${width}`);
    this.columnWidths[col] = width;
    let height = this.getColumnHeight(0);
    for (let y = 0; y < this.params.numRows; y++) {
      let token = this.state.grid[col][y];
      if (token) {
        resizeToken(token, width, height);
        moveTo(token, this.getColumnLeft(col), token.offsetTop, this.dropTimePerBox);
      }
    }
  }

  resizeRow(row, height) {
    console.log(`Resizing row ${row} to height: ${height}`);
    this.columnHeights[row] = height;
    let width = this.getColumnWidth(0);

    for (let x = 0; x <this.params.numColumns; x++) {
      let token = this.state.grid[x][row];
      if (token) {
        resizeToken(token, width, height);
        moveTo(token, token.offsetLeft, this.getColumnTop(row), this.dropTimePerBox);
      }
    }
  }

  addColumn(col, width) {
   this.params.numColumns += 1;
    let newCol = Array(this.params.numRows).fill(null);
    this.state.grid.splice(col, 0, newCol);
    this.columnWidths.splice(col, 0, width);

    for (let y = 0; y < this.params.numRows; y++) {
      for (let x = col + 1; x <this.params.numColumns; x++) {
        let token = this.state.grid[x][y];
        if (token) {
          moveTo(token, this.getColumnLeft(x), token.offsetTop, this.dropTimePerBox);
        }
      }
    }
  }

  shrinkCurrentToken(width) {
    let token = this.state.currentBlock;
    if (token) {
      resizeToken(token, token.offsetWidth - width, token.offsetHeight);
      moveTo(token, token.offsetLeft, token.offsetTop, this.dropTimePerBox);
    }
  }

  applyConstraint(col) {
    // we want to move this to the bottom
    let y = this.params.numRows - 1;

    // remove prev constraint element
    if (this.state.constraints[col]) {
      this.state.constraints[col].remove();
    }

    this.state.constraints[col] = this.state.currentBlock;

    moveTo(this.state.currentBlock, this.state.currentBlockLeft, this.getColumnTop(y), this.dropTimePerBox);

    // this.state.currentBlock.remove();
  }

  applyDelete(col) {
    // Find the bottommost token in the column
    let bottommostY = -1;
    for (let y = this.params.numRows - 1; y >= 0; y--) {
      if (this.state.grid[col][y] != null) {
        bottommostY = y;
        break;
      }
    }
    
    if (bottommostY == -1) {
      console.log('no token to delete');
      return;
    }

    // delete the bottommost token
    this.removeTokenAt(col, bottommostY);

    // shift each token down
    for (let y = bottommostY - 1; y >= 0; y--) {
      let token = this.state.grid[col][y];
      if (token) {
        this.state.grid[col][y + 1] = token;
        this.state.grid[col][y] = null;
        moveTo(token, token.offsetLeft, this.getColumnTop(y + 1), this.dropTimePerBox);
      }
    }
  }
 
  removeTokenAt(x, y) {
    let removed = null
    let token = this.state.grid[x][y];
    if (token) {
      removed = token.remove();
    }
    this.state.grid[x][y] = null;
    return removed;
  }

  collide(x) {
    for (let y = 0; y < this.params.numRows; y++) {
      if (this.state.grid[x][y] != null) {
        return y - 1;
      }
    }
    return this.params.numRows - 1;
  }

  bottomLine() {
    let bottom = [];
    for (let x = 0; x <this.params.numColumns; x++) {
      let token = this.state.grid[x][this.params.numRows - 1];
      bottom.push(token);
    }
    return bottom;
  }

  matches(bottomTokens) {
    let search = bottomTokens.map(token => token == '' ? '.' : token).join(' ');
    let match = this.corpus.doc.match(bottomTokens.join(' ')).terms().out('array');
    console.log({search, match})
  }

  /// return a serialization that can reconstruct the state
  getState() {
    let state = {
      numColumns: this.params.numColumns,
      numRows: this.params.numRows,
      cellHeight: this.params.cellHeight,
      cellWidth: this.params.cellWidth,
      gridOffsetX: this.params.gridStartX,
      gridOffsetY: this.params.gridStartY,
      grid: this.serializeGrid(),
      text: this.getCompletedPoemText(),
    }
    return state;
  }

  /// serialize the grid from DOM elements to plain data
  serializeGrid() {
    return this.state.grid.map(column => 
      column.map(block => {
        if (!block) return null;
        
        // Extract token data from the DOM element
        const blockWord = block.querySelector('.block-word');
        const text = blockWord ? blockWord.textContent : '';
        
        // Determine the type from classes
        let type = 'token';
        if (block.classList.contains('delete')) {
          type = 'delete';
        } else if (block.classList.contains('constraint')) {
          type = 'constraint';
        }
        
        // Get constraint info if it exists
        const constraintAttr = block.getAttribute('data-constraint');
        let constraint = null;
        if (type === 'constraint' && constraintAttr) {
          constraint = {
            type: 'word', // default, could be extended
            value: constraintAttr
          };
        }
        
        return {
          text,
          type,
          pos: constraintAttr !== 'none' ? constraintAttr : undefined,
          constraint
        };
      })
    );
  }

  /// reconstruct grid from serialized state
  fromState(state) {
    // Reconstruct the grid
    this.state.grid = state.grid.map((column, x) =>
      column.map((tokenData, y) => {
        if (!tokenData) return null;
        
        // Create a block element from the serialized data
        const blockElement = createBlockAt(
          tokenData,
          this.getColumnLeft(x),
          this.getColumnTop(y),
          this.columnWidths[x],
          this.columnHeights[y],
          this.colorBy
        );
        
        return blockElement;
      })
    );
  }
}