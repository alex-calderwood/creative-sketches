function createWordAt(text, left, top, width, height, wordType = 'random') {
  const newElement = document.createElement('div');
  newElement.classList.add('move');
  newElement.classList.add('mistake');
  newElement.textContent = text;

  // Only apply random Tetris colors if it's not a delete block
  if (text !== '←') {
    // Color mapping based on word type
    const colorMap = {
      'verb': { bg: '#ff0000', light: '#ff6666', dark: '#cc0000', darker: '#FFFFFF' }, // Red for verbs
      'noun': { bg: '#0000ff', light: '#6666ff', dark: '#0000cc', darker: '#FFFFFF' }, // Blue for nouns
      'adjective': { bg: '#00ff00', light: '#66ff66', dark: '#00cc00', darker: '#009900' }, // Green for adjectives
      'linear': { bg: '#ffff00', light: '#ffff66', dark: '#cccc00', darker: '#FFFFFF' }, // Yellow for linear
      'random': { bg: '#ff8800', light: '#ffaa44', dark: '#cc6600', darker: '#FFFFFF' }  // Orange for random
    };
    
    // Get color based on word type, fallback to random if type not found
    const color = colorMap[wordType] || colorMap['random'];
    
    newElement.style.backgroundColor = color.bg;
    newElement.style.borderColor = `${color.light} ${color.dark} ${color.dark} ${color.light}`;
    newElement.style.color = color.darker; // Use darkest variant for best text contrast
  }

  newElement.style.left = `${left}px`;
  newElement.style.top = `${top}px`;
  newElement.style.width = `${width}px`;
  newElement.style.height = `${height}px`;

  document.body.appendChild(newElement); 
  return newElement;
}


class Dropper {
  constructor() {
    this.wordElements = [];
    this.corpus = new Corpus(); // Add corpus instance

    this.numColumns = 5;
    this.numRows = 18;

    this.deleteProbability = 0.4;

    // Grid positioning
    this.gridOffsetX = 200;
    this.gridOffsetY = 100;
    this.gridWidth = window.innerWidth - this.gridOffsetX;
    this.gridHeight = window.innerHeight - this.gridOffsetY;

    this.state = {
      currentWord: null,
      curX: 0,
      curY: 0,
      // 2D array of elements
      grid: Array(this.numColumns).fill().map(() => Array(this.numRows).fill(null)),
    }

    this.cellHeight = this.gridHeight / this.numRows;
    this.cellWidth = this.gridWidth / this.numColumns;

    console.log({
      numColumns: this.numColumns,
      numRows: this.numRows,
      cellHeight: this.cellHeight,
      cellWidth: this.cellWidth,
      gridOffsetX: this.gridOffsetX,
      gridOffsetY: this.gridOffsetY,
    })

    this.tickTime = 100; // ms
    this.dropTime = 800; // ms

    let ticker = setInterval(() => {
      this.tick();
    }, this.tickTime);

    this.watchArrowKeys();
    this.setupControls();

    this.completedWordsTop = 20;
    
    // Initialize sound system
    this.initializeSounds();
  }


  setupControls() {
    // Delete ratio control
    const deleteRatioSelect = document.getElementById('delete-ratio');
    deleteRatioSelect.addEventListener('change', (e) => {
      this.deleteProbability = parseFloat(e.target.value);
    });
  
    // Paste text button
    const pasteBtn = document.getElementById('paste-text-btn');
    pasteBtn.addEventListener('click', () => {
      this.promptForText();
    });
  
    // Modal controls
    const modal = document.getElementById('corpus-modal');
    const closeBtn = document.getElementById('close-modal');
    const cancelBtn = document.getElementById('cancel-corpus');
    const saveBtn = document.getElementById('save-corpus');
    const textarea = document.getElementById('corpus-textarea');
    const textarea2 = document.getElementById('corpus-textarea2');
  
    // Close modal handlers
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  
    cancelBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
  
    // Save corpus handler
    saveBtn.addEventListener('click', () => {
      const text = textarea.value.trim();
      const text2 = textarea2.value.trim();
      if (text) {
        this.corpus.setTextFromString(text);
      }
      if (text2) {
        this.corpus.appendToCorpus(text2);
      }
      modal.style.display = 'none';
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
  }

  promptForText() {
    const modal = document.getElementById('corpus-modal');
    const textarea = document.getElementById('corpus-textarea');
    
    // Show current corpus text
    textarea.value = this.corpus.text || '';
    
    // Show modal
    modal.style.display = 'flex';
    
    // Focus on textarea
    setTimeout(() => textarea.focus(), 100);
  }

  async initializeSounds() {
    await soundManager.initialize();
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

  tick() {
    if (this.state.currentWord) {
      // this.dropWord(this.state.currentWord);
    } else {
      this.dropNext();
    }
  }

  dropNext() {
    let isDelete = Math.random() < this.deleteProbability;
    let wordData = isDelete ? { word: '←', type: 'delete' } : this.corpus.getNextWord();

    this.state.curY = 0;
    this.state.currentWord = createWordAt(wordData.word, this.gridOffsetX + this.state.curX * this.cellWidth, this.gridOffsetY + this.state.curY * this.cellHeight, this.cellWidth, this.cellHeight, wordData.type);

    if (isDelete) {
      this.state.currentWord.classList.add('delete');
    }

    this.wordElements.push(this.state.currentWord);
  }

  dropWord(element) {
    if (element.classList.contains('delete')) {
      this.applyDelete(this.state.curX);
      this.state.currentWord.remove();
    } else {
      this.dropAndUpdate(element);
    }

    if (this.state.currentWord) {
      this.state.currentWord = null; 
    }

    let completedLines = this.getCompletedLines();
    if (completedLines && completedLines.length > 0) {
      console.log('completed lines', completedLines);
      // Play line complete sound
      setTimeout(() => {
        this.moveCompletedLine(completedLines);
        soundManager.playSound('woof');

      }, this.dropTime);
    }
  }

  moveCompletedLine(completedLines) {
    // Sort completed lines from bottom to top to avoid conflicts
    completedLines.sort((a, b) => b - a);
    
    for (let row of completedLines) {
      let completedWords = this.collectCompletedWords(row);
      this.removeCompletedWordsFromGrid(row);
      this.shiftWordsDown(row);
      this.animateCompletedWordsToDestination(completedWords);
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
          moveTo(word, word.offsetLeft, newTop, this.dropTime);
        }
      }
    }
  }

  animateCompletedWordsToDestination(completedWords) {
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
      word.classList.remove('mistake');
      word.classList.add('word');
      const position = wordPositions[index];
      moveTo(word, position.left, position.top, this.dropTime);
    });

    // Show the permanent words and remove originals after animation
    setTimeout(() => {
      permanentWords.forEach(word => word.style.opacity = '1');
      this.removeOriginalWords(completedWords);
    }, this.dropTime);

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
    let [topY, collidedWord] = this.collide(x);
    console.log({x, topY, collidedWord});
    let newTop = this.gridOffsetY + topY * this.cellHeight;
    moveTo(element, element.offsetLeft, newTop, this.dropTime);
    this.state.grid[x][topY] = element;
    setTimeout(() => {
      soundManager.playSound('rain/rain1');
    }, this.dropTime);
  }

  applyDelete(col) {
    let [_, collidedWord] = this.collide(col);
    if (collidedWord == null) {
      console.log('no word to delete');
      return;
    }

    // delete the last word
    this.removeWordAt(col, this.numRows - 1);

    // shift each down
    for (let y = this.numRows; y > 0; y--) {
      let word = this.state.grid[col][y];
      this.state.grid[col][y + 1] = word;
      if (word) {
        moveTo(word, word.offsetLeft, this.gridOffsetY + (y + 1) * this.cellHeight, this.dropTime);
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


}

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
  let dropper = new Dropper();
  dropper.corpus.setCorpusFromFile('corpora/short/less_time.txt').then(words => {
    console.log(words);
  });
});