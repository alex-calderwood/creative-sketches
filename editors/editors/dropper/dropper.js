function createWordAt(text, left, top, width, height) {
  const newElement = document.createElement('div');
  newElement.classList.add('move');
  newElement.classList.add('dropping-word');
  newElement.textContent = text;

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

    this.numColumns = 10;
    this.numRows = 20;

    this.state = {
      currentWord: null,
      curX: 0,
      curY: 0,
      // 2D array of elements
      grid: Array(this.numColumns).fill().map(() => Array(this.numRows).fill(null)),
    }

    this.cellHeight = window.innerHeight / this.numRows;
    this.cellWidth = window.innerWidth / this.numColumns;

    console.log({
      numColumns: this.numColumns,
      numRows: this.numRows,
      cellHeight: this.cellHeight,
      cellWidth: this.cellWidth,
    })

    this.tickPeriod = 100; // ms
    this.dropSpeed = 800; // ms

    let ticker = setInterval(() => {
      this.tick();
    }, this.tickPeriod);

    this.watchArrowKeys();
    this.setupBackground();
  }

  setupBackground() {
      // draw a box for each column
      let box = document.createElement('div');
      box.classList.add('object');
      box.style.left = this.cellWidth * (this.numColumns - 1) + 'px';
      box.style.bottom = window.innerHeight - this.cellHeight * (this.numRows - 1) + 'px';
      box.style.width = `${this.cellWidth}px`;
      box.style.height = `${this.cellHeight}px`;
      box.style.backgroundColor = '#111111';
      document.body.appendChild(box);
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
    let isDelete = Math.random() < 0.4;
    let word = isDelete ? '←' : this.getNextWord();

    this.state.curY = 0;
    this.state.currentWord = createWordAt(word, this.state.curX * this.cellWidth, this.state.curY * this.cellHeight, this.cellWidth, this.cellHeight);

    if (isDelete) {
      this.state.currentWord.classList.add('delete');
    }

    this.wordElements.push(this.state.currentWord);
  }

  getNextWord() {
    if (this.index === undefined) {
      this.index = 0;
    }
    return this.upcomingWords[this.index++ % this.upcomingWords.length];
  }
  
  async readCorpus(filename) {
    const assetsFolder = '/editors/assets';
    try {
      const filePath = `${assetsFolder}/${filename}`;
      console.log('Loading corpus from:', filePath);
      const response = await fetch(filePath);
      const text = await response.text();
      console.log('Corpus loaded:', text);
      // split on regex space
      this.upcomingWords = text.split(/\s+/);
    } catch (error) {
      console.error('Error loading corpus:', filename, error);
      this.upcomingWords = [];
    }
  }

  /* 
    Process a word dropping:
    When a word hits the bottom of the screen or collides with another word,
    it stops moving and is added to the grid. If it hits the trash column
    (rightmost column) it is deleted.
  */
  dropWord(element) {
    if (element.classList.contains('delete')) {
      this.applyDelete(this.state.curX);
      this.state.currentWord.remove();

    } else if (this.inTrashColumn()) {
      // delete the word
      console.log('deleting word');
      this.state.currentWord.remove();
      return;
    } else {
      this.dropAndUpdate(element);
    }


    if (this.state.currentWord) {
      this.state.currentWord = null; 
    }

    // if (this.checkCollide()) {
    //   this.processWordHitBottom();
    // } else {
    //   this.state.curY += 1;
    //   let newLeft = this.state.curX * this.cellWidth;
    //   let newTop =  this.cellHeight * this.state.curY;
    //   moveTo(element, newLeft, newTop, this.dropSpeed);
    // }
  }
  
  processWordHitBottom() {
    // let currentWord = this.state.grid[this.state.curX][this.state.curY];
    // if (currentWord) {
    //   currentWord.remove();
    // }
    // this.state.grid[this.state.curX][this.state.curY] = this.state.currentWord;
    // this.state.curY = 0;

    if (this.state.currentWord.classList.contains('delete')) {
      this.applyDelete(this.state.curX);
      // this.state.currentWord.remove(); // delete the delete word
      this.state.currentWord = null;
      return;
    }

    this.state.grid[this.state.curX][this.state.curY] = this.state.currentWord;
    this.state.currentWord = null;
  }

  dropAndUpdate(element) {
    let x = this.state.curX;
    let [topY, collidedWord] = this.collide(x);
    console.log({x, topY, collidedWord});
    let newTop = topY * this.cellHeight;
    moveTo(element, element.offsetLeft, newTop, this.dropSpeed);
    this.state.grid[x][topY] = element;
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
    console.log('shifting down', col, this.numRows - 2);
    for (let y = this.numRows; y > 0; y--) {
      // move each word down
      let word = this.state.grid[col][y];
      this.state.grid[col][y + 1] = word;

      console.log('shifting down', col, y + 1, word);
      if (word) {
        moveTo(word, word.offsetLeft, (y + 1) * this.cellHeight, this.dropSpeed);
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

  inTrashColumn() {
    return this.state.curX == this.numColumns - 1;
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

let dropper = new Dropper();
dropper.readCorpus('corpora/finnegans_wake_raw_cleaned.txt').then(words => {
  console.log(words);
});