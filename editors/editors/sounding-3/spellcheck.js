let speaker = new Speaker();
class SpellChecker {
    constructor(options = {}) {
      this.options = {
        checkDelay: 100,        // Milliseconds to wait after typing stops
        squiggleColor: 'red',
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

      const [correctWords, currentMisspellings] = this.getMispellings(tokens);
      const prevMisspellings = this.textState.misspellings;

      const newMisspellings = this.findNewTokens(this.textState.misspellings, currentMisspellings);
      this.textState.misspellings = currentMisspellings;

      // if (currentMisspellings.length != prevMisspellings.length) { this.emitMisspellingsChanged(newMisspellings); }
      // this.emitWordCountChanged(tokens.length);
      
      // this.markup(currentMisspellings, correctWords);

      let mostRecent = tokens.length > 0 ? [tokens[tokens.length -1]] : [];
      let others = tokens.slice(0, tokens.length - 1);
      console.log({mostRecent, others})

      this.mistakeMarkup(mostRecent.concat(others), []);
      
      if (this.event?.data == ' ' || this.event?.inputType == 'insertLineBreak' ) {
        let typedText = mostRecent.map(t => t.text);
        let template = sample([
          `${typedText} is not dreamlike`,
          `${typedText} cannot be dreamt`,
          `${typedText} is awake`,
          `You don't ${typedText} in dreams`,
          `Drift further than ${typedText}`,
          `Do you really drift into ${typedText}`,
          `Pillows are not stuffed with ${typedText} stuffing`,
          `wake from ${typedText}`,
          `${typedText} is a nightmare`,
          `what a nightmare ${typedText} is`,
          `you don't dream of ${typedText}`,
          `${typedText} is wakeful!`,
          `${typedText} is wakeful!`,
        ])
        let words = template.replace("$TEXT", mostRecent.map(t => t.text))

        speak(words, defaultVoice, 1.2, 1.1);
        // speaker.speak(words);
      }
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
    squiggleColor: 'red'
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