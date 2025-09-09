function createWordAt(text, left, top, width, height, wordType = 'random') {

  if (!text || text === 'undefined') {
    console.warn('createWordAt called with invalid text:', text);
    return null;
  }

  const newElement = document.createElement('div');
  newElement.classList.add('move');
  newElement.classList.add('block');
  
  const colorMap = {
    'verb': { bg: '#ff0000', light: '#ff6666', dark: '#cc0000', darker: "#F4ACB7" }, // Red for verbs
    'noun': { bg: '#0000ff', light: '#6666ff', dark: '#0000cc', darker: '#9D8189' }, // Blue for nouns
    'adjective': { bg: '#00ff00', light: '#66ff66', dark: '#00cc00', darker: '#D1CA98' }, // Green for adjectives
    'linear': { bg: '#ffff00', light: '#ffff66', dark: '#cccc00', darker: '#2075ffff' }, // Yellow for linear
    'random': { bg: '#ff8800', light: '#ffaa44', dark: '#cc6600', darker: '#D1CA98' },  // Orange for random
    'delete': { bg: '#000000', light: '#000000', dark: '#000000', darker: '#000000' }  // Black for delete
  }

  const color = colorMap[wordType] || colorMap['random'];
  
  // newElement.style.backgroundColor = color.bg;
  // newElement.style.borderColor = `${color.light} ${color.dark} ${color.dark} ${color.light}`;
  newElement.style.color = color.darker; // Use darkest variant for best text contrast

  newElement.style.left = `${left}px`;
  newElement.style.top = `${top}px`;
  newElement.style.height = `${height}px`;
  newElement.style.width = `${width}px`;
  newElement.style.fontSize = `${height}px`;

  document.body.appendChild(newElement);

  const blockWordElement =  document.createElement('div');
  blockWordElement.classList.add('block-word');
  blockWordElement.style.fontSize = `10px`;

  blockWordElement.textContent = text;
  newElement.appendChild(blockWordElement);

  requestAnimationFrame(() => { // make sure it has rendered before measuring
    setTimeout(() => {
    let rect = blockWordElement.getBoundingClientRect();
    let scale = width / rect.width;
    let scaleY = height / rect.height;
    
    blockWordElement.style.transform = `scaleX(${scale}) scaleY(${scaleY})`;
    }, 1); // Just 1ms delay helps the calculation be correct
  });

  return newElement;
}

class Dropper {
  constructor() {
    this.wordElements = [];
    this.corpus = new Corpus(); // Add corpus instance

    this.numColumns = 5;
    this.numRows = 12;

    this.deleteProbability = 0.3;

    // Grid positioning
    this.gridOffsetX = 200;
    this.gridOffsetY = 100;
    this.gridWidth = window.innerWidth - this.gridOffsetX;
    this.gridHeight = window.innerHeight - this.gridOffsetY;

    // Individual cell sizing
    this.cellHeight = this.gridHeight / this.numRows;
    this.cellWidth = this.gridWidth / this.numColumns;

    this.state = {
      currentWord: null,
      curX: 0,
      curY: 0,
      // 2D array of elements
      grid: Array(this.numColumns).fill().map(() => Array(this.numRows).fill(null)),
    }

    console.log({
      numColumns: this.numColumns,
      numRows: this.numRows,
      cellHeight: this.cellHeight,
      cellWidth: this.cellWidth,
      gridOffsetX: this.gridOffsetX,
      gridOffsetY: this.gridOffsetY,
    })

    this.tickTime = 100; // ms
    this.dropTimePerBox = 50; // ms
    this.completionTime = 1000; // ms

    let ticker = setInterval(() => {
      this.tick();
    }, this.tickTime);

    this.watchArrowKeys();
    this.watchSwipes();
    this.setupControls();

    this.completedWordsTop = 20;
    
    // Initialize sound system
    this.initializeSounds();
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
      this.deleteProbability = parseFloat(e.target.value);
      console.log('New delete probability:', this.deleteProbability);
      e.target.blur(); // Remove focus after selection
    });
    this.deleteProbability = parseFloat(deleteRatioSelect.value);
  
    // Content strategy control
    const contentStrategySelect = document.getElementById('mode');
    contentStrategySelect.addEventListener('change', (e) => {
      this.corpus.selectionStrategy(e.target.value);
      console.log('New content strategy:', this.corpus.mode);
      e.target.blur(); // Remove focus after selection
    });
    this.corpus.selectionStrategy(contentStrategySelect.value);
  
    // Paste text button
    const pasteBtn = document.getElementById('paste-text-btn');
    pasteBtn.addEventListener('click', () => {
      this.promptForText();
      pasteBtn.blur(); // Remove focus after clicking
    });
  
    // Modal controls
    const modal = document.getElementById('corpus-modal');
    const closeBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-corpus');
    const saveBtn = document.getElementById('save-corpus');
  
    // Close modal handlers
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
      closeBtn.blur(); // Remove focus after clicking
    });
  
    cancelBtn.addEventListener('click', () => {
      modal.style.display = 'none';
      cancelBtn.blur(); // Remove focus after clicking
    });
  
    // Save corpus handler
    saveBtn.addEventListener('click', () => {
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
      
      modal.style.display = 'none';
      saveBtn.blur(); // Remove focus after clicking
    });
  
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });
  
    // Close modal with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.style.display === 'flex') {
        modal.style.display = 'none';
      }
    });

    // Instructions modal controls
    const instructionsModal = document.getElementById('instructions-modal');
    const closeInstructionsBtn = document.getElementById('close-instructions-modal');
    const closeInstructionsBtnFooter = document.getElementById('close-instructions-btn');

    // Close instructions modal handlers
    closeInstructionsBtn.addEventListener('click', () => {
      instructionsModal.style.display = 'none';
      closeInstructionsBtn.blur(); // Remove focus after clicking
    });

    closeInstructionsBtnFooter.addEventListener('click', () => {
      instructionsModal.style.display = 'none';
      closeInstructionsBtnFooter.blur(); // Remove focus after clicking
    });

    // Close instructions modal when clicking outside
    instructionsModal.addEventListener('click', (e) => {
      if (e.target === instructionsModal) {
        instructionsModal.style.display = 'none';
      }
    });

    // Close instructions modal with Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && instructionsModal.style.display === 'flex') {
        instructionsModal.style.display = 'none';
      }
    });
    
    // Add corpus button handler
    const addCorpusBtn = document.getElementById('add-corpus-btn');
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
      addCorpusBtn.blur(); // Remove focus from button after clicking
    });
  }

  promptForText() {
    const modal = document.getElementById('corpus-modal');
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
    
    // Show modal
    modal.style.display = 'flex';
  }

  showInstructions() {
    const modal = document.getElementById('instructions-modal');
    modal.style.display = 'flex';
  }

  async initializeSounds() {
    await soundManager.initialize();
  }


  moveRight() {
    console.log('moveRight', this.state.curX);
    if (this.state.curX == this.numColumns - 1) {
      this.state.curX = 0;
    } else {
      this.state.curX += 1;
    }

    let newLeft = this.gridOffsetX + this.state.curX * this.cellWidth;
    moveTo(this.state.currentWord, newLeft, this.state.currentWord.offsetTop, 0);
  }

  moveLeft() {
    console.log('moveLeft', this.state.curX);
    if (this.state.curX == 0) {
      this.state.curX = this.numColumns - 1;
    } else {
      this.state.curX -= 1;
    }
    let newLeft = this.gridOffsetX + this.state.curX * this.cellWidth;
    moveTo(this.state.currentWord, newLeft, this.state.currentWord.offsetTop, 0);
  }


  // watch arrow keys
  watchArrowKeys() {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') {
        if (this.state.curX == this.numColumns - 1) {
          return;
        }
        this.state.curX += 1;
        moveTo(this.state.currentWord, this.state.currentWord.offsetLeft + this.cellWidth, this.state.currentWord.offsetTop, 0);
      } else if (event.key === 'ArrowLeft') {
        if (this.state.curX == 0) {
          return;
        }
        this.state.curX -= 1;
        moveTo(this.state.currentWord, this.state.currentWord.offsetLeft - this.cellWidth, this.state.currentWord.offsetTop, 0);
      } else if (event.key === 'ArrowDown') {
        // move to the bottom
        this.dropWord(this.state.currentWord);
      }
    });
  }


  watchArrowKeys() {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight') {
        this.moveRight();
      } else if (event.key === 'ArrowLeft') {
        this.moveLeft();
      } else if (event.key === 'ArrowDown' || event.key === ' ') {
        this.dropWord(this.state.currentWord);
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
      if (!this.state.currentWord) return;

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
        this.dropWord(this.state.currentWord);
      }
    });
  }

  tick() {
    if (this.state.currentWord) {
      // this.dropWord(this.state.currentWord);
    } else {
      this.dropNext();
      console.log(this.bottomWords());
      // console.log(this.matches(this.bottomWords()));
    }
  }

  dropNext() {
    let isDelete = Math.random() < this.deleteProbability;
    let wordData = isDelete ? { word: '←', type: 'delete' } : this.corpus.getNextWord();

    this.state.curY = 0;

    if (isDelete) {
      this.state.currentWord = createWordAt(wordData.word, this.gridOffsetX + this.state.curX * this.cellWidth, this.gridOffsetY + this.cellHeight * (this.numRows - 1), this.cellWidth, this.cellHeight, wordData.type);
      this.state.currentWord.classList.add('delete');
    } else {
      this.state.currentWord = createWordAt(wordData.word, this.gridOffsetX + this.state.curX * this.cellWidth, this.gridOffsetY + this.state.curY * this.cellHeight, this.cellWidth, this.cellHeight, wordData.type);
    }

    

    this.wordElements.push(this.state.currentWord);
  }

  dropWord(element) {
    if (element == null) {
      console.error("Attempting to drop null element", element)
    }

    let doCycle = false;
    if (element.classList.contains('delete')) {
      this.applyDelete(this.state.curX);
      this.state.currentWord.remove();
      doCycle = true;
    } else {
      doCycle = this.dropAndUpdate(element);
    }

    if (this.state.currentWord && doCycle) {
      this.state.currentWord = null; 
    }

    let completedLines = this.getCompletedLines();
    if (completedLines && completedLines.length > 0) {
      console.log('completed lines', completedLines);
      // Play line complete sound
      setTimeout(() => {
        this.moveCompletedLine(completedLines);
        soundManager.playSound('woof');

      }, this.completionTime);
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
          
          let newTop = this.gridOffsetY + newY * this.cellHeight;
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
      moveTo(word, position.left, position.top, this.completionTime, 500, true);
    });

    // Show the permanent words and remove originals after animation
    setTimeout(() => {
      permanentWords.forEach(word => word.style.opacity = '1');
      this.removeOriginalWords(completedWords);
    }, this.completionTime);

    // Move down for the next completed line
    this.completedWordsTop += this.cellHeight;
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
  
  dropAndUpdate(element) {
    let x = this.state.curX;
    let [y, collidedWord] = this.collide(x);
    if (y < 0) {
      console.log('no space to drop', x, y)
      return false;
    }

    console.log({x, y, collidedWord})
    let newTop = this.gridOffsetY + y * this.cellHeight;

    console.log({'style': element.offsetTop, 'newTop': newTop})

    let dropTime = this.dropTimePerBox * Math.abs(element.offsetTop - newTop) / this.cellHeight;
    moveTo(element, element.offsetLeft, newTop, dropTime);
    this.state.grid[x][y] = element;
    setTimeout(() => {
      soundManager.playSound('rain/rain1');
    }, dropTime);
    return true;
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
        moveTo(word, word.offsetLeft, this.gridOffsetY + (y + 1) * this.cellHeight, this.dropTimePerBox);
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
    return bottom.map(word => word == null ? '' : word.textContent);
  }

  matches(bottomWords) {
    let search = bottomWords.map(word => word == '' ? '.' : word).join(' ');
    let match = this.corpus.doc.match(bottomWords.join(' ')).terms().out('array');
    console.log({search, match})
  }
}


let defaultCorpora = [
  'corpora/short/here.txt',
  // 'corpora/short/art.txt', 
  'corpora/short/harry_potter_ch1.txt', 
  'corpora/short/love_breton.txt', 
  'corpora/short/less_time.txt', 
  'corpora/books/nadja.txt',
];
let [file1, file2] = defaultCorpora.sort(() => 0.5 - Math.random()).slice(0, 2);
let defaultCorpus = file1; // Use first file as default


// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
  let dropper = new Dropper();
  dropper.corpus.setCorpusFromFile(defaultCorpus).then(words => {
    // console.log(words);
  });
});