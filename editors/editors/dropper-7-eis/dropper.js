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

  let additionalScaleMod = {x: 1, y: 1};
  if (element.classList.contains('delete')) {
    additionalScaleMod = DELETE_SCALE_MOD;
  }

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

class Dropper {
  constructor() {
    this.tokenElements = [];
    this.corpus = null;
    this.colorBy = 'pos'; // Default color by part of speech

    this.numColumns = 6;
    this.numRows = 12;

    // Grid positioning
    this.gridStartX = 200;
    this.gridStartY = 100;
    this.gridEndGap = 100;
    this.gridWidth = window.innerWidth - this.gridStartX;
    this.gridHeight = window.innerHeight - this.gridStartY - this.gridEndGap;

    // Individual cell sizing
    this.cellHeight = this.gridHeight / this.numRows;
    this.cellWidth = this.gridWidth / this.numColumns;

    // numColumns length, filled with 
    this.columnWidths = Array(this.numColumns).fill(this.cellWidth);
    this.columnHeights = Array(this.numRows).fill(this.cellHeight);

    this.probabilities = {
      delete: 0.25,
      constraint: 0.2,
      token: -1,
    }
    this.numInitialConstraints = 0;

    this.state = {
      currentBlock: null,
      curX: 0,
      curY: 0,
      currentBlockLeft: this.gridStartX,
      currentBlockTop: this.gridStartY,
      // 2D array of elements
      grid: Array(this.numColumns).fill().map(() => Array(this.numRows).fill(null)),
      tokenChain: [],
      constraints: Array(this.numColumns).fill(null),
      blockHistory: [],
    }

    // Token chain
    this.tokenChainLength = 10;
    this.tokenChainStart = {left: this.gridStartX * this.numColumns * this.cellWidth, top: this.gridStartY};

    console.log({
      numColumns: this.numColumns,
      numRows: this.numRows,
      cellHeight: this.cellHeight,
      cellWidth: this.cellWidth,
      gridOffsetX: this.gridStartX,
      gridOffsetY: this.gridStartY,
    })

    this.tickTime = 100; // ms
    this.dropTimePerBox = 50; // ms
    this.completionTime = 1000; // ms
    this.arrowSpeed = 170; // ms

    this.completedMode = 'constraint';
    this.completedTokensTop = 20;
    this.completedTokensLineHeight = this.cellHeight;
  }

  initializeAnyConstraints() {
    // Create 'word' constraint blocks for each column
    for (let x = 0; x < this.numColumns; x++) {
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
      const blockElement = createBlockAt(anyBlock, this.getColumnLeft(x), this.getColumnTop(this.numRows - 1), this.columnWidths[x], this.columnHeights[0], this.colorBy);
      
      // Set it as a constraint for this column
      if (this.state.constraints[x]) {
        this.state.constraints[x].remove();
      }
      this.state.constraints[x] = blockElement;
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
    this.columnHeights = Array(this.numRows).fill(this.cellHeight);

    // Clear current game state if it exists
    if (this.state) {
      if (this.state.currentBlock) {
        this.state.currentBlock.remove();
      }
      this.state.tokenChain.forEach(token => token.remove());
      
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

      // Clear completed tokens
      if (this.completedTokensContainer) {
        this.completedTokensContainer.innerHTML = '';
      }
    }

    // Reset state
    this.state = {
      currentBlock: null,
      curX: 0,
      curY: 0,
      currentBlockLeft: this.gridStartX,
      currentBlockTop: this.gridStartY,
      grid: Array(this.numColumns).fill().map(() => Array(this.numRows).fill(null)),
      tokenChain: [],
      constraints: Array(this.numColumns).fill(null),
      blockHistory: [],
    };

    this.completedTokensTop = 20;

    // Initialize corpus
    this.corpus = new Corpus();
    if (options.sourceText) {
      this.corpus.texts = [options.sourceText];
      this.corpus.updateFromTexts();
    } else if (options.corpusFile) {
      await this.corpus.setCorpusFromFile(options.corpusFile);
    } else {
      await this.corpus.setCorpusFromFile(defaultCorpus);
    }

    // Set up controls and event listeners (only on first initialization)
    if (!options.isReset) {
      this.setupControls();
      this.watchArrowKeys();
      this.watchSwipes();
      await this.initializeSounds();
      
      // Start the game loop
      setInterval(() => {
        this.tick();
      }, this.tickTime);
    }

    // Initialize constraints
    this.initializeAnyConstraints();
  }

  getColumnWidth(x) {
    return this.columnWidths[x];
  }

  getColumnHeight(y) {
    return this.columnHeights[y];
  }

  getColumnLeft(x) {
    return this.gridStartX + this.columnWidths.slice(0, x).reduce((sum, width) => sum + width, 0);
  }

  getColumnTop(y) {
    return this.gridStartY + this.columnHeights.slice(0, y).reduce((sum, height) => sum + height, 0);
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

  setupControls() {
    // Instructions button
    const instructionsBtn = document.getElementById('instructions-btn');
    instructionsBtn.addEventListener('click', () => {
      this.showInstructions();
      instructionsBtn.blur(); // Remove focus after clicking
    });

    // Delete ratio control
    const deleteRatioSelect = document.getElementById('delete-ratio');
    deleteRatioSelect.addEventListener('change', (e) => {
      this.probabilities.delete = parseFloat(e.target.value);
      console.log('New delete probability:', this.probabilities.delete);
      e.target.blur(); // Remove focus after selection
    });
    this.probabilities.delete = parseFloat(deleteRatioSelect.value);
  
    // Content strategy control
    const contentStrategySelect = document.getElementById('mode');
    contentStrategySelect.addEventListener('change', (e) => {
      this.corpus.selectionStrategy(e.target.value);
      console.log('New content strategy:', this.corpus.mode);
      e.target.blur(); // Remove focus after selection
    });
    this.corpus.selectionStrategy(contentStrategySelect.value);

    // Color by control
    const colorBySelect = document.getElementById('color-by');
    colorBySelect.addEventListener('change', (e) => {
      this.colorBy = e.target.value;
      e.target.blur(); // Remove focus after selection
    });
    this.colorBy = colorBySelect.value;
    console.log('New color by:', this.colorBy);
  
    // Add corpus button handler
    const addCorpusBtn = document.getElementById('add-corpus-btn');
    const saveCorpusBtn = document.getElementById('save-corpus');
    
    // Initialize corpus container with current texts
    this.updateCorpusContainer();

    addCorpusBtn.addEventListener('click', () => {
      const container = document.getElementById('corpora-container');
      const textareaCount = container.querySelectorAll('textarea').length;
      
      const textareaDiv = document.createElement('div');
      textareaDiv.classList.add('corpus-textarea-container');
      
      const label = document.createElement('label');
      label.textContent = `Text ${textareaCount + 1}:`;
      label.classList.add('corpus-textarea-label');
      
      const textarea = document.createElement('textarea');
      textarea.value = '';
      textarea.classList.add('corpus-textarea');
      textarea.dataset.index = textareaCount;
      
      textareaDiv.appendChild(label);
      textareaDiv.appendChild(textarea);
      container.appendChild(textareaDiv);
      
      // Focus on the new textarea
      setTimeout(() => textarea.focus(), 100);
      addCorpusBtn.blur();
    });

    // Save corpus handler
    saveCorpusBtn.addEventListener('click', () => {
      const container = document.getElementById('corpora-container');
      const textareas = container.querySelectorAll('textarea');
      const texts = [];
      
      textareas.forEach(textarea => {
        const text = textarea.value.trim();
        if (text) {
          texts.push(text);
        }
      });
      
      if (texts.length > 0) {
        this.corpus.texts = texts;
        this.corpus.updateFromTexts();
      }
      
      saveCorpusBtn.blur();
    });

    // Instructions modal controls
    const instructionsModal = document.getElementById('instructions-modal');
    const closeInstructionsBtn = document.getElementById('close-instructions-modal');
    const closeInstructionsBtnFooter = document.getElementById('close-instructions-btn');

    // Close instructions modal handlers
    closeInstructionsBtn.addEventListener('click', () => {
      instructionsModal.style.display = 'none';
      closeInstructionsBtn.blur();
    });

    closeInstructionsBtnFooter.addEventListener('click', () => {
      instructionsModal.style.display = 'none';
      closeInstructionsBtnFooter.blur();
    });

    // Close instructions modal when clicking outside
    instructionsModal.addEventListener('click', (e) => {
      if (e.target === instructionsModal) {
        instructionsModal.style.display = 'none';
      }
    });

    // Options modal controls
    const optionsBtn = document.getElementById('options-btn');
    const optionsModal = document.getElementById('options-modal');
    const closeOptionsBtn = document.getElementById('close-options-modal');
    const closeOptionsBtnFooter = document.getElementById('close-options-btn');

    // Open options modal
    optionsBtn.addEventListener('click', () => {
      optionsModal.style.display = 'flex';
      optionsBtn.blur();
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

    // New Game modal controls
    const newGameBtn = document.getElementById('new-game-btn');
    const newGameModal = document.getElementById('new-game-modal');
    const closeNewGameBtn = document.getElementById('close-new-game-modal');
    const closeNewGameBtnFooter = document.getElementById('close-new-game-btn');
    const startNewGameBtn = document.getElementById('start-new-game-btn');

    // Open new game modal
    newGameBtn.addEventListener('click', async () => {
      const sourceTextArea = document.getElementById('new-game-source');
      let file = getNewCorpus();
      let text = await getNewCorpusText(file);
      sourceTextArea.value = text;
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
      const sourceText = document.getElementById('new-game-source').value.trim();

      await this.initialize({
        numColumns,
        numRows,
        sourceText,
        isReset: true
      });
      newGameModal.style.display = 'none';
      startNewGameBtn.blur();
    });

    // Close any modal with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (instructionsModal.style.display === 'flex') {
          instructionsModal.style.display = 'none';
        }
        if (optionsModal.style.display === 'flex') {
          optionsModal.style.display = 'none';
        }
        if (newGameModal.style.display === 'flex') {
          newGameModal.style.display = 'none';
        }
      }
    });
    
  }

  updateCorpusContainer() {
    const container = document.getElementById('corpora-container');
    
    // Clear existing content
    container.innerHTML = '';
    
    // Create a textarea for each text
    this.corpus.texts.forEach((text, index) => {
      const textareaDiv = document.createElement('div');
      textareaDiv.classList.add('corpus-textarea-container');
      
      const label = document.createElement('label');
      label.textContent = `Text ${index + 1}:`;
      label.classList.add('corpus-textarea-label');
      
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.classList.add('corpus-textarea');
      textarea.dataset.index = index;
      
      textareaDiv.appendChild(label);
      textareaDiv.appendChild(textarea);
      container.appendChild(textareaDiv);
    });
    
    // If no texts exist, create one empty textarea
    if (this.corpus.texts.length === 0) {
      const textareaDiv = document.createElement('div');
      textareaDiv.classList.add('corpus-textarea-container');
      
      const label = document.createElement('label');
      label.textContent = 'Text 1:';
      label.classList.add('corpus-textarea-label');
      
      const textarea = document.createElement('textarea');
      textarea.value = '';
      textarea.classList.add('corpus-textarea');
      textarea.dataset.index = 0;
      
      textareaDiv.appendChild(label);
      textareaDiv.appendChild(textarea);
      container.appendChild(textareaDiv);
    }
  }

  showInstructions() {
    const modal = document.getElementById('instructions-modal');
    modal.style.display = 'flex';
  }

  async initializeSounds() {
    await soundManager.initialize();
  }


  moveRight() {
    if (this.state.curX == this.numColumns - 1) {
      this.state.curX = 0;
    } else {
      this.state.curX += 1;
    }

    let newLeft = this.getColumnRect(this.state.curX, 0).left;
    this.state.currentBlockLeft = newLeft;
    resizeToken(this.state.currentBlock, this.columnWidths[this.state.curX], this.columnHeights[0]);
    moveTo(this.state.currentBlock, newLeft, this.state.currentBlock.offsetTop, this.arrowSpeed, false, 'ease-in-out');
    this.updateTokenChainLocations({left: newLeft, top: this.state.currentBlock.offsetTop});
  }

  moveLeft() {
    if (this.state.curX == 0) {
      this.state.curX = this.numColumns - 1;
    } else {
      this.state.curX -= 1;
    }
    let newLeft = this.getColumnRect(this.state.curX, 0).left;
    this.state.currentBlockLeft = newLeft;
    resizeToken(this.state.currentBlock, this.columnWidths[this.state.curX], this.columnHeights[0]);
    moveTo(this.state.currentBlock, newLeft, this.state.currentBlock.offsetTop, this.arrowSpeed, false, 'ease-in-out');
    this.updateTokenChainLocations({left: newLeft, top: this.state.currentBlock.offsetTop});
  }

  watchArrowKeys() {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') {
        this.moveRight();
      } else if (event.key === 'ArrowLeft') {
        this.moveLeft();
      } else if (event.key === 'ArrowDown' || event.key === ' ') {
        this.dropBlock(this.state.currentBlock);
      } else if (event.key === 'ArrowUp') {
        // this.addColToGrid(this.state.curX);
      }
    });
  }

  watchSwipes() {
    let touchStartX = 0;
    let touchStartY = 0;
    const swipeThreshold = 50; // minimum distance for a swipe

    document.addEventListener('touchstart', (event) => {
      touchStartX = event.touches[0].clientX;
      touchStartY = event.touches[0].clientY;
      console.log('touchstart', touchStartX, touchStartY);
    });

    document.addEventListener('touchend', (event) => {
      console.log('touchend', touchStartX, touchStartY);
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
        this.dropBlock(this.state.currentBlock);
      }
    });
  }

  tick() {
    if (this.state.currentBlock) {
      // this.dropToken(this.state.currentToken);
    } else {
      this.nextBlockUp();
      this.printState();
    }
  }

  printState() {
    let line = this.bottomLine();
    let tokens = line.map(token => token == null ? '' : token.textContent);
    console.log("Current line:", tokens);

    let constraints =  this.targetConstraints();
    let constraintValues = this.getConstraintsFromWordsInRow(this.numRows - 1);

    console.log("Line constraints", constraintValues);
    console.log("Target constraints:", constraints);
  }

  generateNextBlockData() {
    let isBeginning = this.state.blockHistory.length < this.numInitialConstraints;
    let blockType =  isBeginning ? 'constraint' : roll(this.probabilities);

    // if we are using the pos strategy, update the constraint 
    if (this.corpus.selectionStrategy == "pos") {
      let constraints = this.targetConstraints();
      constraints = constraints.filter(constraint => constraint != null);
      console.log("Constraints", constraints);
      this.corpus.selectionStrategy("pos", {tokenPOSOrder: constraints});
    }

    let tokenData;
    switch (blockType) {
      case "delete":
        tokenData = { text: '←', type: 'delete' };
        break;
      case "constraint":
        tokenData = this.corpus.getNextConstraint();
        break;
      case "token":
        tokenData = this.corpus.getNextToken();
        break;
      case "null":
        throw new Error("generateNextBlock: type is null");
    }

    this.state.blockHistory.push(tokenData);
    return tokenData;
  }

  createCurrentMarkup() {
    const markup = document.getElementById('current-markup-sprite').cloneNode(true);
    markup.classList.add('current-markup');
    return markup;
  }

  nextBlockUp() {

    // fill up the token chain with new tokens from the corpus
    while (this.state.tokenChain.length < this.tokenChainLength) {
      let blockData = this.generateNextBlockData();
      let blockElement = createBlockAt(blockData, this.tokenChainStart.left, this.tokenChainStart.top, this.cellWidth, this.cellHeight, this.colorBy);
      this.tokenElements.push(blockElement);
      this.state.tokenChain.unshift(blockElement);
    }

    // pop the last token off the token chain and set it as the current token
    this.state.curY = 0;
    this.state.currentBlock = this.state.tokenChain.pop();
    this.state.currentBlock.classList.add('current-token');
    
    // Add dots to current token
    const markup = this.createCurrentMarkup();
    this.state.currentBlock.appendChild(markup);
  }

  updateTokenChainLocations(end) {
    let start = this.tokenChainStart;
    let newLeft = end.left;

    for (let i = this.state.tokenChain.length - 1; i >= 0; i--) {
      let curToken = this.state.tokenChain[i];
      if (!curToken) {
        console.error("updateTokenChainLocations curToken is null", i, this.state.tokenChain);
        continue;
      }

      let curWidth = curToken?.getBoundingClientRect()?.width || 0;
      if (!curWidth) {
        console.error("updateTokenChainLocations curWidth is 0", i);
        continue;
      }

      newLeft += curWidth;
      let newLoc = {
        left: newLeft,
        top: start.top
      }

      moveTo(curToken, newLoc.left, newLoc.top, this.arrowSpeed, false, 'ease-in-out');
    }
  }

  dropBlock(element) {
    if (element == null) {
      console.error("Attempting to drop null element", element)
    }

    // Remove current-token class and markup
    element.classList.remove('current-token');
    const markup = element.querySelector('.current-markup');
    if (markup) markup.remove();

    let doCycle = false;
    let dropTime = 0;

    // drop the block / apply animation
    if (element.classList.contains('delete')) {
      this.applyDelete(this.state.curX);
      this.state.currentBlock.remove();
      doCycle = true;
    } else if (element.classList.contains('constraint')) {
      this.applyConstraint(this.state.curX);
      doCycle = true;
    } else { // a token
      [doCycle, dropTime] = this.dropAndUpdateGrid(element);
    }

    if (doCycle) {
      let loc = {left: this.state.currentBlockLeft - this.cellWidth, top: this.state.currentBlockTop};
      this.updateTokenChainLocations(loc);
    }

    // reset the token
    if (this.state.currentBlock && doCycle) {
      this.state.currentBlock = null; 
    }

    // Check for completed lines
    let constraintCompletedState = this.getCompletedConstraints();
    let completedLines = this.getCompletedLines(constraintCompletedState);

    // Update the visuals - don't show the ::after for completed 
    this.updateConstraintVisuals(constraintCompletedState);

    if (completedLines && completedLines.length > 0) {
      console.log('completed lines', completedLines);
      // Play line complete sound
      setTimeout(() => {
        this.moveCompletedLine(completedLines);
        soundManager.playSound('woof');

      }, dropTime);
    }
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
  }

  collectCompletedTokens(row) {
    let completedTokens = [];
    for (let x = 0; x < this.numColumns; x++) {
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
    for (let x = 0; x < this.numColumns; x++) {
      this.state.grid[x][row] = null;
    }
  }

  shiftTokensDown(row) {
    for (let y = row - 1; y >= 0; y--) {
      for (let x = 0; x < this.numColumns; x++) {
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
    // Create a container for completed tokens if it doesn't exist
    if (!this.completedTokensContainer) {
      this.completedTokensContainer = document.createElement('div');
      this.completedTokensContainer.classList.add('completed-container');
      document.body.appendChild(this.completedTokensContainer);
    }

    // Create permanent tokens and measure their natural positions
    const permanentTokens = this.createPermanentTokens(completedTokens);
    const tokenPositions = permanentTokens.map(token => {
      const rect = token.getBoundingClientRect();
      return { left: rect.left, top: rect.top };
    });
    
    // Hide the permanent tokens
    permanentTokens.forEach(token => token.style.opacity = '0');
    
    // Animate original tokens to those positions
    completedTokens.forEach(({ token }, index) => {
      token.classList.remove('block');
      token.classList.add('word');
      const position = tokenPositions[index];
      moveTo(token, position.left, position.top, this.completionTime, true, 'ease-out');
    });

    // Show the permanent tokens and remove originals after animation
    setTimeout(() => {
      permanentTokens.forEach(token => token.style.opacity = '1');
      this.removeOriginalTokens(completedTokens);
    }, this.completionTime);

    // Move down for the next completed line
    this.completedTokensTop += this.completedTokensLineHeight;
  }

  createPermanentTokens(completedTokens) {
    const permanentTokens = [];
    completedTokens.forEach(({ token }, index) => {
      const newToken = document.createElement('div');
      newToken.textContent = token.textContent;
      newToken.classList.add('inline-word');
      
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
    console.log('completed', {completedConstraints})
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
    for (let x = 0; x < this.numColumns; x++) {
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
    let y = this.numRows - 1;
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
  
  dropAndUpdateGrid(element) {
    let x = this.state.curX;
    let [y, collidedToken] = this.collide(x);
    if (y < 0) {
      console.log('no space to drop', x, y)
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
    this.dropBlock(this.state.currentBlock);
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
    this.columnHeights[row] = height;
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
    let token = this.state.currentBlock;
    if (token) {
      resizeToken(token, token.offsetWidth - width, token.offsetHeight);
      moveTo(token, token.offsetLeft, token.offsetTop, this.dropTimePerBox);
    }
  }

  applyConstraint(col) {
    // we want to move this to the bottom
    let y = this.numRows - 1;

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
    for (let y = this.numRows - 1; y >= 0; y--) {
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
}


let defaultCorpora = [
  // 'corpora/short/here.txt',
  // 'corpora/short/sacred_emily.txt',
  // 'corpora/short/love_breton.txt', 
  // 'corpora/short/less_time.txt', 
  // 'corpora/books/nadja.txt',
  'corpora/short/eis.txt',
  'corpora/short/eis_wiki.txt',

  // uninteresting
  // 'corpora/short/art.txt', 
  // 'corpora/short/harry_potter_ch1.txt', 
];
// let [file1, file2] = defaultCorpora.sort(() => 0.5 - Math.random()).slice(0, 2);
// let defaultCorpus = file1; // Use first file as default

function getNewCorpus() {
  let order = defaultCorpora.sort(() => 0.5 - Math.random());
  return order[0];
}

async function getNewCorpusText(filename) {
  const assetsFolder = window.BASE_PATH + '/assets';
  const filePath = `${assetsFolder}/${filename}`;
  const response = await fetch(filePath);
  return response.text();
}

let defaultCorpus = getNewCorpus();

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', async () => {
  let dropper = new Dropper();
  await dropper.initialize({ corpusFile: defaultCorpus });
});
