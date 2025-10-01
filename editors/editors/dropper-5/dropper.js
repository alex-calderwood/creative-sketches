
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

// resize a word to a new width and height using the transform property scaleX and scaleY
function resizeWord(element, width, height) {
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
  element.style.fontSize = `${height}px`;

  let blockWordElement = element.querySelector('.block-word');
  blockWordElement.style.transform = `scaleX(1) scaleY(1)`;
  // blockWordElement.style.transformOrigin = `center center`;

  requestAnimationFrame(() => { // make sure it has rendered before measuring
    setTimeout(() => {
    let rect = blockWordElement.getBoundingClientRect();
    let scale = width / rect.width;
    let scaleY = height / rect.height;
    
    blockWordElement.style.transform = `scaleX(${scale}) scaleY(${scaleY})`;
    }, 1); // Just 1ms delay helps the calculation be correct
  });
}

class Dropper {
  constructor() {
    this.wordElements = [];
    this.corpus = null;
    this.colorBy = 'pos'; // Default color by part of speech

    this.numColumns = 5;
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
      constraint: 0.1,
      word: -1,
    }
    this.numInitialConstraints = 8;

    this.state = {
      currentBlock: null,
      curX: 0,
      curY: 0,
      currentBlockLeft: this.gridStartX,
      currentBlockTop: this.gridStartY,
      // 2D array of elements
      grid: Array(this.numColumns).fill().map(() => Array(this.numRows).fill(null)),
      wordChain: [],
      constraints: Array(this.numColumns).fill(null),
      blockHistory: [],
    }

    // Word chain
    this.wordChainLength = 5;
    this.wordChainStart = {left: this.gridStartX * this.numColumns * this.cellWidth, top: this.gridStartY};

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

    this.completedWordsTop = 20;
    this.completedWordsLineHeight = this.cellHeight;
  }

  async initialize(corpusFile) {
    // Initialize corpus first
    this.corpus = new Corpus();
    await this.corpus.setCorpusFromFile(corpusFile);

    // Now that corpus is ready, set up the rest
    this.setupControls();
    this.watchArrowKeys();
    this.watchSwipes();
    await this.initializeSounds();

    // Start the game loop
    setInterval(() => {
      this.tick();
    }, this.tickTime);
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
        this.corpus.updateWordsFromTexts();
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

    // Close any modal with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (instructionsModal.style.display === 'flex') {
          instructionsModal.style.display = 'none';
        }
        if (optionsModal.style.display === 'flex') {
          optionsModal.style.display = 'none';
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
    resizeWord(this.state.currentBlock, this.columnWidths[this.state.curX], this.columnHeights[0]);
    moveTo(this.state.currentBlock, newLeft, this.state.currentBlock.offsetTop, this.arrowSpeed, false, 'ease-in-out');
    this.updateWordChainLocations({left: newLeft, top: this.state.currentBlock.offsetTop});
  }

  moveLeft() {
    if (this.state.curX == 0) {
      this.state.curX = this.numColumns - 1;
    } else {
      this.state.curX -= 1;
    }
    let newLeft = this.getColumnRect(this.state.curX, 0).left;
    this.state.currentBlockLeft = newLeft;
    resizeWord(this.state.currentBlock, this.columnWidths[this.state.curX], this.columnHeights[0]);
    moveTo(this.state.currentBlock, newLeft, this.state.currentBlock.offsetTop, this.arrowSpeed, false, 'ease-in-out');
    this.updateWordChainLocations({left: newLeft, top: this.state.currentBlock.offsetTop});
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
        this.addColToGrid(this.state.curX);
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
      // this.dropWord(this.state.currentWord);
    } else {
      // this.nextWordUp();
      this.nextBlockUp();
      this.printState();
    }
  }

  printState() {
    let line = this.bottomLine();
    let words = line.map(word => word == null ? '' : word.textContent);
    console.log("Current line:", words);

    let constraints =  this.targetConstraints();
    let constraintValues = this.constraintsForRow(this.numRows - 1);

    console.log("Line constraints", constraintValues);
    console.log("Target constraints:", constraints);
  }

  generateNextBlock() {
    let isBeginning = this.state.blockHistory.length < this.numInitialConstraints;
    let blockType =  isBeginning ? 'constraint' : roll(this.probabilities);

    // if we are using the pos strategy, update the constraint 
    if (this.corpus.selectionStrategy == "pos") {
      let constraints = this.targetConstraints();
      constraints = constraints.filter(constraint => constraint != null);
      console.log("Constraints", constraints);
      this.corpus.selectionStrategy("pos", {wordPOSOrder: constraints});
    }

    let wordData;
    switch (blockType) {
      case "delete":
        wordData = { text: '←', type: 'delete' };
        break;
      case "constraint":
        wordData = this.corpus.getNextConstraint();
        break;
      case "word":
        wordData = this.corpus.getNextWord();
        break;
      case "null":
        throw new Error("generateNextBlock: type is null");
    }

    this.state.blockHistory.push(wordData);
    return wordData;
  }

  nextBlockUp() {
    // fill up the word chain with new words from the corpus
    while (this.state.wordChain.length < this.wordChainLength) {
      let block = this.generateNextBlock();
      let blockElt = createBlockAt(block, this.wordChainStart.left, this.wordChainStart.top, this.cellWidth, this.cellHeight, this.colorBy);
      this.wordElements.push(blockElt);
      this.state.wordChain.unshift(blockElt);
    }

    // pop the last word off the word chain and set it as the current word
    this.state.curY = 0;
    this.state.currentBlock = this.state.wordChain.pop();
  }

  updateWordChainLocations(end) {
    let start = this.wordChainStart;
    let newLeft = end.left;

    for (let i = this.state.wordChain.length - 1; i >= 0; i--) {
      let curWord = this.state.wordChain[i];
      if (!curWord) {
        console.error("updateWordChainLocations curWord is null", i, this.state.wordChain);
        continue;
      }

      let curWidth = curWord?.getBoundingClientRect()?.width || 0;
      if (!curWidth) {
        console.error("updateWordChainLocations curWidth is 0", i);
        continue;
      }

      newLeft += curWidth;
      let newLoc = {
        left: newLeft,
        top: start.top
      }

      moveTo(curWord, newLoc.left, newLoc.top, this.arrowSpeed, false, 'ease-in-out');
    }
  }

  nextWordUp() {
    let wordData = this.generateNextBlock();

    this.state.curY = 0;

    if (isDelete) {
      let rect = this.getColumnRect(this.state.curX, this.numRows - 1);
      this.state.currentBlock = createBlockAt(wordData, rect.left, rect.top, rect.width, rect.height, this.colorBy);
      this.state.currentBlock.classList.add('delete');
    } else if (isBetweenWord) {
      let rect = this.getColumnRect(this.state.curX, this.state.curY);
      this.state.currentBlock = createBlockAt(wordData, rect.left, rect.top, rect.width, rect.height, this.colorBy);
      this.state.currentBlock.classList.add('between');
      } else {
        let rect = this.getColumnRect(this.state.curX, this.state.curY);
        this.state.currentBlock = createBlockAt(wordData, rect.left, rect.top, rect.width, rect.height, this.colorBy);
    }

    this.wordElements.push(this.state.currentBlock);
  }

  dropBlock(element) {
    if (element == null) {
      console.error("Attempting to drop null element", element)
    }

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
    } else { // a word
      [doCycle, dropTime] = this.dropAndUpdateGrid(element);
    }

    if (doCycle) {
      let loc = {left: this.state.currentBlockLeft - this.cellWidth, top: this.state.currentBlockTop};
      this.updateWordChainLocations(loc);
    }

    // reset the word
    if (this.state.currentBlock && doCycle) {
      this.state.currentBlock = null; 
    }

    // Check for completed lines
    let completedLines = this.getCompletedLines();
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
      let completedWords = this.collectCompletedWords(row);
      this.removeCompletedWordsFromGrid(row);
      this.shiftWordsDown(row);
      this.animateCompletedWords(completedWords);
    }
  }

  collectCompletedWords(row) {
    let completedWords = [];
    for (let x = 0; x < this.numColumns; x++) {
      let word = this.state.grid[x][row];
      if (word) {
        completedWords.push({ word, x, y: row });
      }
    }
    return completedWords;
  }

  removeCompletedWordsFromGrid(row) {
    for (let x = 0; x < this.numColumns; x++) {
      this.state.grid[x][row] = null;
    }
  }

  shiftWordsDown(row) {
    for (let y = row - 1; y >= 0; y--) {
      for (let x = 0; x < this.numColumns; x++) {
        let word = this.state.grid[x][y];
        if (word) {
          let newY = y + 1;
          this.state.grid[x][newY] = word;
          this.state.grid[x][y] = null;
          
          let newTop = this.getColumnTop(newY);
          moveTo(word, word.offsetLeft, newTop, this.dropTimePerBox);
        }
      }
    }
  }

  animateCompletedWords(completedWords) {
    // Create a container for completed words if it doesn't exist
    if (!this.completedWordsContainer) {
      this.completedWordsContainer = document.createElement('div');
      this.completedWordsContainer.classList.add('completed-container');
      document.body.appendChild(this.completedWordsContainer);
    }

    // Create permanent words and measure their natural positions
    const permanentWords = this.createPermanentWords(completedWords);
    const wordPositions = permanentWords.map(word => {
      const rect = word.getBoundingClientRect();
      return { left: rect.left, top: rect.top };
    });
    
    // Hide the permanent words
    permanentWords.forEach(word => word.style.opacity = '0');
    
    // Animate original words to those positions
    completedWords.forEach(({ word }, index) => {
      word.classList.remove('block');
      word.classList.add('word');
      const position = wordPositions[index];
      moveTo(word, position.left, position.top, this.completionTime, true, 'ease-out');
    });

    // Show the permanent words and remove originals after animation
    setTimeout(() => {
      permanentWords.forEach(word => word.style.opacity = '1');
      this.removeOriginalWords(completedWords);
    }, this.completionTime);

    // Move down for the next completed line
    this.completedWordsTop += this.completedWordsLineHeight;
  }

  createPermanentWords(completedWords) {
    const permanentWords = [];
    completedWords.forEach(({ word }, index) => {
      const newWord = document.createElement('div');
      newWord.textContent = word.textContent;
      newWord.classList.add('inline-word');
      
      this.completedWordsContainer.appendChild(newWord);
      permanentWords.push(newWord);
      
      // Add a space after each word except the last one
      if (index < completedWords.length - 1) {
        const space = document.createElement('span');
        space.textContent = ' ';
        this.completedWordsContainer.appendChild(space);
      }
    });
    
    // Add a line break after each completed row
    const lineBreak = document.createElement('br');
    this.completedWordsContainer.appendChild(lineBreak);
    
    return permanentWords;
  }

  removeOriginalWords(completedWords) {
    completedWords.forEach(({ word }) => {
      word.remove();
    });
  }

  getCompletedLines() {
    let completedMode = 'constraint';
    if (completedMode == 'full') {
      return this.getFullLines();
    } else if (completedMode == 'constraint') {
      return this.getConstrainedLines();
    }

    return [];
  }

  getConstraintValue(word) {
    return word ? word.getAttribute('data-constraint').toLowerCase() : null;
  }

  constraintsForRow(row) {
    let constraints = [];
    for (let x = 0; x < this.numColumns; x++) {
      let word = this.state.grid[x][row];
      constraints.push(this.getConstraintValue(word));
    }
    return constraints;
  }

  // Get the names of the current constraints
  targetConstraints() {
    return this.state.constraints.map(constraint => this.getConstraintValue(constraint));
  }

  // Check if the current constraints match the target constraints
  lineCompleted(constraints, target) {
    return constraints.every((constraint, index) => constraint == target[index]);
  }

  getConstrainedLines() {
    let completedLines = [];

    let y = this.numRows - 1;
    // for (let y = 0; y < this.numRows; y++) {
    let constraints = this.constraintsForRow(y);
    let target = this.targetConstraints();
    let lineCompleted = this.lineCompleted(constraints, target);
    
    if (lineCompleted) {
      completedLines.push(y);
    }
    // }
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
    let [y, collidedWord] = this.collide(x);
    if (y < 0) {
      console.log('no space to drop', x, y)
      return [false, 0];
    }

    let newTop = this.getColumnTop(y);
    
    let dropTime = this.dropTimePerBox * Math.abs(element.offsetTop - newTop) / this.getColumnHeight(0);

    // move the word to the bottom using a quadratic gravity
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
    this.shrinkCurrentWord(newWidth);
    this.dropBlock(this.state.currentBlock);
  }

  resizeColumn(col, width) {
    console.log(`Resizing column ${col} to width: ${width}`);
    this.columnWidths[col] = width;
    let height = this.getColumnHeight(0);
    for (let y = 0; y < this.numRows; y++) {
      let word = this.state.grid[col][y];
      if (word) {
        resizeWord(word, width, height);
        moveTo(word, this.getColumnLeft(col), word.offsetTop, this.dropTimePerBox);
      }
    }
  }

  resizeRow(row, height) {
    console.log(`Resizing row ${row} to height: ${height}`);
    this.columnHeights[row] = height;
    let width = this.getColumnWidth(0);

    for (let x = 0; x < this.numColumns; x++) {
      let word = this.state.grid[x][row];
      if (word) {
        resizeWord(word, width, height);
        moveTo(word, word.offsetLeft, this.getColumnTop(row), this.dropTimePerBox);
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
        let word = this.state.grid[x][y];
        if (word) {
          moveTo(word, this.getColumnLeft(x), word.offsetTop, this.dropTimePerBox);
        }
      }
    }
  }

  shrinkCurrentWord(width) {
    let word = this.state.currentBlock;
    if (word) {
      resizeWord(word, word.offsetWidth - width, word.offsetHeight);
      moveTo(word, word.offsetLeft, word.offsetTop, this.dropTimePerBox);
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
    // Find the bottommost word in the column
    let bottommostY = -1;
    for (let y = this.numRows - 1; y >= 0; y--) {
      if (this.state.grid[col][y] != null) {
        bottommostY = y;
        break;
      }
    }
    
    if (bottommostY == -1) {
      console.log('no word to delete');
      return;
    }

    // delete the bottommost word
    this.removeWordAt(col, bottommostY);

    // shift each word down
    for (let y = bottommostY - 1; y >= 0; y--) {
      let word = this.state.grid[col][y];
      if (word) {
        this.state.grid[col][y + 1] = word;
        this.state.grid[col][y] = null;
        moveTo(word, word.offsetLeft, this.getColumnTop(y + 1), this.dropTimePerBox);
      }
    }
  }
 
  removeWordAt(x, y) {
    let removed = null
    let word = this.state.grid[x][y];
    if (word) {
      removed = word.remove();
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
      let word = this.state.grid[x][this.numRows - 1];
      bottom.push(word);
    }
    return bottom;
  }

  bottomWords() {
    let bottom = this.bottomLine();
  }

  matches(bottomWords) {
    let search = bottomWords.map(word => word == '' ? '.' : word).join(' ');
    let match = this.corpus.doc.match(bottomWords.join(' ')).terms().out('array');
    console.log({search, match})
  }
}


let defaultCorpora = [
  'corpora/short/here.txt',
  'corpora/short/sacred_emily.txt',
  'corpora/short/love_breton.txt', 
  'corpora/short/less_time.txt', 
  'corpora/books/nadja.txt',

  // uninteresting
  // 'corpora/short/art.txt', 
  // 'corpora/short/harry_potter_ch1.txt', 
];
let [file1, file2] = defaultCorpora.sort(() => 0.5 - Math.random()).slice(0, 2);
let defaultCorpus = file1; // Use first file as default


// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', async () => {
  let dropper = new Dropper();
  await dropper.initialize(defaultCorpus);
});
