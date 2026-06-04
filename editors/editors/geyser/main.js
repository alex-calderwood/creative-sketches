let speaker = new PhoneSpeaker();

allPhonemes = new Set()

class SpellChecker {
    constructor(options = {}) {
      this.options = {
        checkDelay: 100,
        ...options
      };
      
      this.targetElement = null;
      this.textState = {
        tokens: [],
        misspellings: [],
        wordCount: 0,
      }
      this.isChecking = false;    
      this.checkNeeded = false;
      this.eventTarget = new EventTarget();
    }

    numMistakes() {
      return this.textState.misspellings.length;
    }

    wordCount() {
      return this.textState.wordCount;
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
      this.textState.misspellings = [];
      
      // Set up event listeners for content changes
      element.addEventListener('input', this.handleInput.bind(this));
      
      this.checkSpelling();
      
      return this;
    }

    handleInput(event) {
      this.checkNeeded = true;
      this.event = event; // log the most recent event
      
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

      let tokens = iterateContentEditableWords(this.targetElement);

      const prevTokens = this.textState.tokens;
      const newTokens = this.findNewTokens(prevTokens, tokens);

      this.textState.tokens = tokens;
      this.textState.wordCount = tokens.length;

      console.log("new tokens", {tokens, newTokens})

      let mostRecentWord = newTokens.length > 0 ? newTokens[0] : undefined;
      
      console.log("most recent", {mostRecentWord})

      let phonemes = speaker.getPronunciation(mostRecentWord?.text)
      console.log({phonemes})

      if (!phonemes || !phonemes.length) {
        return;
      }

      let phoneme = phonemes[phonemes.length - 1];
      speaker.say(phoneme)
    }

    checkSpelling() {
      this.checkNeeded = true;
      if (!this.isChecking) {
        this.processCheck();
      }
    }

    getMispellings(words) {
      const misspelledRanges = words.filter(word => !this.isWordCorrect(word.text));
      const correctRanges = words.filter(word => this.isWordCorrect(word.text));
      return [correctRanges, misspelledRanges];
    }

    // Check if a word is spelled correctly
    isWordCorrect(word) {
      const normalizedWord = word.toLowerCase();
      return !normalizedWord.includes('e');
    }

    mistakeMarkup(mispelledTokens, correctTokens) {
      if (!this.targetElement) return;
      
      let overlay = document.getElementById("overlay");
      overlay.innerHTML = '';
      
      let editorRect = this.targetElement.getBoundingClientRect();
      overlay.style.width = `${editorRect.width}px`;
      overlay.style.height = `${editorRect.height}px`;

      mispelledTokens.forEach(misspelled => {
        const squiggle = document.createElement('div');
        squiggle.classList.add('spell-error-mark');
        squiggle.style.left = `${misspelled.rect.left - editorRect.left}px`;
        squiggle.style.top = `${misspelled.rect.bottom - editorRect.top}px`; // Position at bottom of text
        squiggle.style.width = `${misspelled.rect.width}px`;

        const overlayWord = document.createElement('div');
        overlayWord.classList.add('overlay-word');
        overlayWord.textContent = misspelled.text
        overlayWord.style.left = `${misspelled.rect.left - editorRect.left}px`;
        overlayWord.style.top = `${misspelled.rect.top - editorRect.top}px`; // Position at bottom of text
        
        overlay.appendChild(squiggle);
        overlay.appendChild(overlayWord);
      });

      correctTokens.forEach(correct =>{
        const correctOverlay = document.createElement('div');
        correctOverlay.classList.add('correct-overlay-word');
        correctOverlay.textContent = correct.text
        correctOverlay.style.left = `${correct.rect.left - editorRect.left}px`;
        correctOverlay.style.top = `${correct.rect.top - editorRect.top}px`; // Position at bottom of text
        
        overlay.appendChild(correctOverlay)
      })

    }

    // Find new misspellings that weren't in the previous set
    findNewTokens(previous, current) {
      const hash = (item) => {return `${item.text}-${item.startIndex}-${item.endIndex}`}
      // Create a simple hash of each previous misspelling for comparison
      const previousHashes = previous.map(hash);
      
      // Filter current misspellings to only those not in previous
      return current.filter(item => {
        return !previousHashes.includes(hash(item));
      });
    }

    // Emit misspellings changed event
    emitMisspellingsChanged(misspellings) {
      const event = new CustomEvent('misspellingsChanged', {
        detail: {
          element: this.targetElement,
          misspellings: misspellings,
          newMistake: misspellings.length > 0,
        }
      });
      this.eventTarget.dispatchEvent(event);
    }

    // Add this new method to emit word count events
    emitWordCountChanged(count) {
      const event = new CustomEvent('wordCountChanged', {
        detail: {
          element: this.targetElement,
          count: count
        }
      });
      this.eventTarget.dispatchEvent(event);
    }
  }

  // Initialize the spellchecker with a sample dictionary
  const demoSpellChecker = new SpellChecker({
    checkDelay: 500,
  });
    
const editor = document.querySelector('#editor');
if (editor) {
  demoSpellChecker.setElement(editor);
}

function onComplete() {
  document.getElementById('editor-container').classList.add('complete');
}

function sample(iterable) {
  return iterable[Math.floor(Math.random() * iterable.length)]
}
