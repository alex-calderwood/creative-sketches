class SpellChecker {
    constructor(options = {}) {
      this.options = {
        checkDelay: 100,        // Milliseconds to wait after typing stops
        squiggleColor: 'red',
        ...options
      };
      
      this.targetElement = null;
      this.textState = {
        misspellings: [],
        wordCount: 0,
      }
      this.isChecking = false;    
      this.checkNeeded = false;
      this.eventTarget = new EventTarget();

      this.continuousCheck = false;

      this.eventTarget.addEventListener('misspellingsChanged', (event) => onMistake(this.numMistakes(), event.detail));


      this.fromSwerveOfShore();
    }

    // Check if a word is spelled correctly
    isWordCorrect(word) {
      let normalizedWord = word.toLowerCase();
      // remove the punctuation
      normalizedWord = normalizedWord.replace(/[^\w\s]/g, '');
      return this.vocab.includes(normalizedWord);
    }

    updateVocabulary(vocab) {
      this.vocab = vocab;
      console.log(this.vocab)
    }

    updateVocabFromText(text) {
      console.log(text)
      let words = text.split(/\s+/).map(word => word.toLowerCase());
      // remove the punctuation
      words = words.map(word => word.replace(/[^\w\s]/g, ''));
      return this.updateVocabulary(words);
    }

    fromSwerveOfShore() {
      let finnegan = fetch("/editors/assets/corpora/finnegans_wake_raw_cleaned.txt")
        .then(response => response.text())
        .then(text => this.updateVocabFromText(text));
      return finnegan;
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

      // If not already checking, start the check process
      if (this.continuousCheck && !this.isChecking) {
        this.processCheckContinuous();
      }

      else if (event.inputType === 'insertText' && event.data.length > 0) {
        // if a space is inserted, we need to check the word before and after
        const isSpace = event.data === ' ';
        if (isSpace) {
          this.performSpellCheck();
        }
      }
    }

    // Process spell checking
    processCheckContinuous() {
      if (!this.checkNeeded) {
        this.isChecking = false;
        return;
      }
      
      this.isChecking = true;
      this.checkNeeded = false;
      
      // Perform the check
      this.performSpellCheck().then(() => {
        // Check if another check is needed when this one is done
        requestAnimationFrame(() => this.processCheckContinuous());
      });
    }

    // Perform the actual spell check (returns a promise)
    async performSpellCheck() {
      if (!this.targetElement) return;
      
      let tokens = iterateContentEditableWords(this.targetElement);
      const [correctWords, currentMisspellings] = this.getMispellings(tokens);
      const prevMisspellings = this.textState.misspellings;

      const newMisspellings = this.findNewMisspellings(this.textState.misspellings, currentMisspellings);
      this.textState.misspellings = currentMisspellings;
      this.textState.wordCount = tokens.length;

      // if (currentMisspellings.length != prevMisspellings.length) { 
        this.emitMisspellingsChanged(newMisspellings);
      //  }
      this.emitWordCountChanged(tokens.length);
      
      this.markup(currentMisspellings, correctWords);
    }

    checkSpelling() {
      this.checkNeeded = true;
      if (!this.isChecking) {
        this.processCheckContinuous();
      }
    }

    getMispellings(words) {
      const misspelledRanges = words.filter(word => !this.isWordCorrect(word.text));
      const correctRanges = words.filter(word => this.isWordCorrect(word.text));
      return [correctRanges, misspelledRanges];
    }


    markup(mispelledTokens, correctTokens) {
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
    findNewMisspellings(previous, current) {
      const hash = (item) => {return `${item.text}-${item.startIndex}-${item.endIndex}`}
      // Create a simple hash of each previous misspelling for comparison
      const previousHashes = previous.map(hash);
      
      // Filter current misspellings to only those not in previous
      return current.filter(item => {
        return !previousHashes.includes(hash(item));
      });
    }

    // Emit misspellings changed event
    emitMisspellingsChanged(newMispellings) {
      const event = new CustomEvent('misspellingsChanged', {
        detail: {
          element: this.targetElement,
          newMispellings: newMispellings,
          isNewMistake: newMispellings.length > 0,
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
    squiggleColor: 'red'
  });
    
const editor = document.querySelector('#editor');
if (editor) {
  demoSpellChecker.setElement(editor);
}

function onComplete() {
  document.getElementById('editor-container').classList.add('complete');
}


/**
 * Unused
 * 
 * Extracts the text content from a contenteditable element, preserving explicit line breaks.
 *
 * It needed to be this complex for when we were doing rich text, but now the <br> and <div> stuff isn't used.
 * 
 * This function clones the provided element to avoid altering the original content. It then
 * replaces <br> tags and the beginnings of <div> tags with newline characters to preserve
 * the visual representation of line breaks. The function does not modify <span> tags, as they
 * are not typically associated with line breaks. The modified content is then returned as a
 * single string with preserved line breaks.
 *
 * @param {HTMLElement} element - The contenteditable element from which to extract text.
 * @returns {string} The text content of the element with \n characters in place of <br> and <div> tags.
*/
function getTextWithWhitespace(element) {
  let clone = element.cloneNode(true);

  // Replace <br> tags with \n
  clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));

  // Replace block elements like <div> with \n and maintain their content
  clone.querySelectorAll('div').forEach(div => {
    div.replaceWith('\n', ...div.childNodes);
  });

  // Extract the textContent from the cloned element
  return clone.textContent;
}