import { BasicEditor } from './BasicEditor.js';
import { SettingsMixin } from '../vault/01-23-2026/src/performances/SettingsMixin.js';

export class SpellcheckPerformance extends SettingsMixin(class {}) {
    constructor(options = {}) { 
      super();
    }

    async initialize(params = {}) {
      this.params = {
        checkDelay: 100,        // Milliseconds to wait after typing stops
        dict: "scowl",
        squiggleColor: 'red',
        reverse: true,
        onEdit: (edit) => {},
        ...BasicEditor.params,
        ...params
      };

      this.settings = [
        ...BasicEditor.settings,
      ]

      this.textState = {
          misspellings: [],
          wordCount: 0,
          text: "",
          ...params.initialState
      }
      
      this.editor = null;
      this.isChecking = false;    
      this.checkNeeded = false;
      this.eventTarget = new EventTarget();

      this.continuousCheck = false;

      this.onEdit = this.params.onEdit;

      // Register an event listener that listens for new mispellings
      // new mispellings will call the onMistake function
      this.misspellingsListener = (event) => onMistake(this.numMistakes(), event.detail);
      this.eventTarget.addEventListener('misspellingsChanged', this.misspellingsListener);

      if (this.params.dict == "finnegan") {
        this.fromSwerveOfShore();
      } else if (this.params.dict == "scowl") {
        this.fromSCOWL();
      }

      this.setElement(document.querySelector('#editor'));

      // this.editor.innerText = this.textState.text;

      // set the size 
      BasicEditor.onSettingChanged(this, 'width', this.params.width, null);

      // set the darm mode
      BasicEditor.onSettingChanged(this, 'darkmode', this.params.darkmode, null);

    }

    onSettingChanged(name, value, oldValue) {
      BasicEditor.onSettingChanged(this, name, value, oldValue);
    }

    // Check if a word is spelled correctly
    isWordCorrect(word) {
      let normalizedWord = word.toLowerCase();
      // remove the punctuation
      normalizedWord = normalizedWord.replace(/[^\w\s]/g, '');

      if (this.params.reverse) {
        return !this.vocab.includes(normalizedWord);
      }

      return this.vocab.includes(normalizedWord);
    }

    updateVocabulary(vocab) {
      this.vocab = vocab;
    }

    updateVocabFromText(text) {
      let words = text.split(/\s+/).map(word => word.toLowerCase());
      // remove the punctuation
      words = words.map(word => word.replace(/[^\w\s]/g, ''));
      return this.updateVocabulary(words);
    }

    fromSwerveOfShore() { // load Finnegan's Wake
      let finnegan = fetch(window.BASE_PATH + "/assets/corpora/finnegans_wake_raw_cleaned.txt")
        .then(response => response.text())
        .then(text => this.updateVocabFromText(text));
      return finnegan;
    }

    async fromSCOWL(size="40") {
      // Official site: http://wordlist.aspell.net/
      // GitHub: https://github.com/en-wl/wordlist

      try {
        // You'd need to host a SCOWL word list file
        const response = await fetch(window.BASE_PATH + `/assets/corpora/scowl/scowl-wl-${size}.txt`);
        const text = await response.text();
        const words = text.split('\n').map(word => word.toLowerCase().trim()).filter(word => word);
        this.updateVocabulary(words);
      } catch (error) {
        console.error('Failed to load SCOWL dictionary:', error);
      }
    }

    numMistakes() {
      return this.textState.misspellings.length;
    }

    wordCount() {
      return this.textState.wordCount;
    }

    getState() {
      let text = getTextWithWhitespace(this.editor);
      let state = {
        ...this.textState,
        text,
      }
      return state;
    }

    // Set the element to check for spelling
    setElement(element) {
      if (!element) return;
      
      // Clear previous element's listener if any
      if (this.editor) {
        this.editor.removeEventListener('input', this.handleInput.bind(this));
      }
      
      // Set new element and initialize
      this.editor = element;
      this.textState.misspellings = [];
      
      // Set up event listeners for content changes
      element.addEventListener('input', this.handleInput.bind(this));
      
      this.checkSpelling();
      
      return this;
    }

    // Clean up resources and event listeners
    destroy() {
      // Remove input event listener
      if (this.editor) {
        this.editor.removeEventListener('input', this.handleInput.bind(this));
        this.editor = null;
      }
      
      // Remove misspellingsChanged event listener
      if (this.eventTarget) {
        this.eventTarget.removeEventListener('misspellingsChanged', this.misspellingsListener);
        this.eventTarget = null;
      }
      
      // Clear any timers or intervals
      if (this.checkTimer) {
        clearTimeout(this.checkTimer);
        this.checkTimer = null;
      }
      
      // Clear state
      this.textState.misspellings = [];
      this.textState.wordCount = 0;
      this.isChecking = false;
      this.checkNeeded = false;
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
      if (!this.editor) return;

      let tokens = iterateContentEditableWords(this.editor);
      const [correctWords, currentMisspellings] = this.getMispellings(tokens);
      const prevMisspellings = this.textState.misspellings;

      const newMisspellings = this.findNewMisspellings(this.textState.misspellings, currentMisspellings);
      this.textState.misspellings = currentMisspellings;
      this.textState.wordCount = tokens.length;

      // if (currentMisspellings.length != prevMisspellings.length) { 
      this.emitMisspellingsChanged(newMisspellings);
      //  }
      // this.emitWordCountChanged(tokens.length);

      for (const misspelling of newMisspellings) {
        this.onEdit(misspelling);
      }
      
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
      if (!this.editor) return;
      
      let overlay = document.getElementById("overlay");
      // overlay.innerHTML = '';
      
      let editorRect = this.editor.getBoundingClientRect();
      overlay.style.width = `${editorRect.width}px`;
      overlay.style.height = `${editorRect.height}px`;

      mispelledTokens.forEach(misspelled => {
        const squiggle = document.createElement('div');
        squiggle.classList.add('spell-error-mark');
        squiggle.style.left = `${misspelled.rect.left - editorRect.left}px`;
        squiggle.style.top = `${misspelled.rect.bottom - editorRect.top}px`; // Position at bottom of text
        squiggle.style.width = `${misspelled.rect.width}px`;

        const mispelledOverlay = document.createElement('div');
        mispelledOverlay.classList.add('overlay-word');
        mispelledOverlay.textContent = misspelled.text
        mispelledOverlay.style.left = `${misspelled.rect.left - editorRect.left}px`;
        mispelledOverlay.style.top = `${misspelled.rect.top - editorRect.top}px`; // Position at bottom of text
        
        overlay.appendChild(squiggle);
        overlay.appendChild(mispelledOverlay);
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
          element: this.editor,
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
          element: this.editor,
          count: count
        }
      });
      this.eventTarget.dispatchEvent(event);
    }
  }


// Reset UI state when changing dictionaries
function resetUI() {
  // Clear mistake list
  // const mistakeList = document.getElementById('mistake-list');
  // if (mistakeList) {
  //   mistakeList.innerHTML = '';
  //   mistakeList.style.visibility = 'hidden';
  // }
  
  // Clear enlarged words array and remove any existing enlarged word elements
  if (typeof enlargedWords !== 'undefined') {
    enlargedWords.forEach(word => {
      if (word.ghost && word.ghost.parentNode) {
        word.ghost.parentNode.removeChild(word.ghost);
      }
    });
    enlargedWords.length = 0;
  }
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