class SpellChecker {
    constructor(options = {}) {
      this.options = {
        checkDelay: 100,        // Milliseconds to wait after typing stops
        squiggleColor: 'red',
        ...options
      };
      
      this.targetElement = null;
      this.misspellings = [];     
      this.isChecking = false;    
      this.checkNeeded = false;
      this.eventTarget = new EventTarget();
    }

    numMistakes() {
      return this.misspellings.length;
    }

    // Set the element to check for spelling
    setElement(element) {
      if (!element) return;
      
      // Clear previous element's listener if any
      if (this.targetElement) {
        this.targetElement.removeEventListener('input', this.handleInput.bind(this));
      }
      
      // Set new element and initialize
      this.targetElement = element;
      this.misspellings = [];
      
      // Set up event listeners for content changes
      element.addEventListener('input', this.handleInput.bind(this));
      
      // Initial check
      this.checkSpelling();
      
      return this;
    }

    handleInput(event) {
      this.checkNeeded = true;
      
      // If not already checking, start the check process
      if (!this.isChecking) {
        this.processCheck();
      }
    }

    // Process spell checking
    processCheck() {
      if (!this.checkNeeded) {
        this.isChecking = false;
        return;
      }
      
      this.isChecking = true;
      this.checkNeeded = false;
      
      // Perform the check
      this.performSpellCheck().then(() => {
        // Check if another check is needed when this one is done
        requestAnimationFrame(() => this.processCheck());
      });
    }

    // Perform the actual spell check (returns a promise)
    async performSpellCheck() {
      if (!this.targetElement) return;
      
      const text = this.targetElement.textContent || '';
      
      // Find incorrectly spelled words
      const words = this.extractWords(text);
      const currentMisspellings = this.findMisspelledRanges(words);
      
      // detect changes
      const newMisspellings = this.findNewMisspellings(this.misspellings, currentMisspellings);
      
      this.misspellings = currentMisspellings;
      
      if (newMisspellings.length > 0) { this.emitMisspellingsChanged(newMisspellings); }
      
      this.markup(currentMisspellings);
    }

    checkSpelling() {
      this.checkNeeded = true;
      if (!this.isChecking) {
        this.processCheck();
      }
    }

    extractWords(text) {
      // Split by non-word characters but keep track of positions
      const wordRegex = /\b[a-z']+\b/gi;
      const words = [];
      let match;
      
      while ((match = wordRegex.exec(text)) !== null) {
        words.push({
          word: match[0],
          start: match.index,
          end: match.index + match[0].length
        });
      }
      
      return words;
    }

    // Find ranges of misspelled words
    findMisspelledRanges(words) {
      const misspelledRanges = [];
      
      words.forEach(({ word, start, end }) => {
        // Skip small words (like 'a', 'I')
        if (word.length <= 1) return;
        
        // Check if the word is in our dictionary
        if (!this.isWordCorrect(word)) {
            let bad = { word, start, end }
            misspelledRanges.push(bad);
        }
      });
      
      return misspelledRanges;
    }

    // Check if a word is spelled correctly
    isWordCorrect(word) {
      // Normalize the word
      const normalizedWord = word.toLowerCase();
      return !normalizedWord.includes('e');
    }

    markup(misspelledRanges) {
      if (!this.targetElement) return;
      
      let overlay = this.targetElement.nextElementSibling;
      
      // Create overlay if it doesn't exist
      if (!overlay || !overlay.classList.contains('overlay')) {
        overlay = document.createElement('div');
        overlay.classList.add('overlay');
        
        // Insert after the element
        this.targetElement.parentNode.insertBefore(overlay, this.targetElement.nextSibling);
      }
      
      // Clear existing marks
      overlay.innerHTML = '';
      
      // Position the overlay right on top of the input
      const rect = this.targetElement.getBoundingClientRect();
      overlay.style.width = `${rect.width}px`;
      overlay.style.height = `${rect.height}px`;
      
      // Add squiggle for each misspelled word
      misspelledRanges.forEach(range => {
        const textNode = this.findTextNodeAtPosition(range.start);
        if (!textNode) return;
        
        const rangeObj = document.createRange();
        const startOffset = range.start - this.getTextNodeOffset(textNode);
        const endOffset = startOffset + range.word.length;
        console.log("spell-> setting offset", {word: range.word, rangeObj, startOffset, endOffset, textNode})
        
        rangeObj.setStart(textNode, startOffset);
        rangeObj.setEnd(textNode, endOffset);
        
        const wordRect = rangeObj.getBoundingClientRect();
        const elementRect = this.targetElement.getBoundingClientRect();
        
        // Create squiggle element
        const squiggle = document.createElement('div');
        squiggle.classList.add('spell-error-mark');
        squiggle.style.left = `${wordRect.left - elementRect.left}px`;
        squiggle.style.top = `${wordRect.bottom - elementRect.top}px`; // Position at bottom of text
        squiggle.style.width = `${wordRect.width}px`;

        const onTopWord = document.createElement('div');
        onTopWord.classList.add('on-top-word')
        
        overlay.appendChild(squiggle);
      });
    }
    
    // Helper function to find the text node at a given position
    findTextNodeAtPosition(position) {
      if (!this.targetElement) return null;
      
      const walker = document.createTreeWalker(this.targetElement, NodeFilter.SHOW_TEXT, null, false);
      let currentNode = walker.nextNode();
      let currentPosition = 0;
      
      while (currentNode) {
        const nodeLength = currentNode.nodeValue.length;
        
        if (position >= currentPosition && position < currentPosition + nodeLength) {
          return currentNode;
        }
        
        currentPosition += nodeLength;
        currentNode = walker.nextNode();
      }
      
      return null;
    }
    
    // Helper function to get the offset of a text node within the element
    getTextNodeOffset(targetNode) {
      if (!this.targetElement) return 0;
      
      const walker = document.createTreeWalker(this.targetElement, NodeFilter.SHOW_TEXT, null, false);
      let currentNode = walker.nextNode();
      let offset = 0;
      
      while (currentNode && currentNode !== targetNode) {
        offset += currentNode.nodeValue.length;
        currentNode = walker.nextNode();
      }
      
      return offset;
    }

    // Find new misspellings that weren't in the previous set
    findNewMisspellings(previous, current) {
      // Create a simple hash of each previous misspelling for comparison
      const previousHashes = previous.map(item => `${item.word}-${item.start}-${item.end}`);
      
      // Filter current misspellings to only those not in previous
      return current.filter(item => {
        const hash = `${item.word}-${item.start}-${item.end}`;
        return !previousHashes.includes(hash);
      });
    }

    // Add event listener for misspelling changes
    onMisspellingsChanged(callback) {
      this.eventTarget.addEventListener('misspellingsChanged', callback);
      return this;
    }

    // Emit misspellings changed event
    emitMisspellingsChanged(misspellings) {
      const event = new CustomEvent('misspellingsChanged', {
        detail: {
          element: this.targetElement,
          misspellings: misspellings
        }
      });
      this.eventTarget.dispatchEvent(event);
    }
  }

  // Initialize the spellchecker with a sample dictionary
  const demoSpellChecker = new SpellChecker({
    checkDelay: 500,
    squiggleColor: 'red'
  });
    
const editor = document.querySelector('#editor');
if (editor) {
  demoSpellChecker.setElement(editor);
}