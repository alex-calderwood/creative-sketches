class Editor {
    constructor(options = {}) {
      this.options = {
        checkDelay: 100,        // Milliseconds to wait after typing stops
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
      this.unprocessedEvents = [];
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

      this.unprocessedEvents.push(event);
      console.log('new input',{ event})
      
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

      const prevTokens = this.textState.tokens;
      let tokens = iterateContentEditableWords(this.targetElement);

      // const newAtAllHash = (item) => {return `${item.rect.left}-${item.rect.top}-${item.text}-${item.startIndex}-${item.endIndex}`}
      const newLocationHash = (item) => {return `${item.rect.left}-${item.rect.top}}`}
      
      const [newTokens, oldTokens] = this.findNewTokens(prevTokens, tokens, newLocationHash);
      this.textState.tokens = tokens;

      const newAndTextHash = (item) => {return `${item.rect.left}-${item.rect.top}-${item.text}`}
      const updatedTokens = this.findNewCharacters(prevTokens, tokens, newAndTextHash);

      console.log('updated', updatedTokens);

      const allNewTokens = newTokens.concat(updatedTokens);
      this.textState.wordCount = tokens.length;
      this.delayedMarkup(oldTokens, allNewTokens);

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

    delayedMarkup(others, recent) {
      if (!this.targetElement) return;
      
      let overlay  = document.getElementById("overlay");
      let overlay2 = document.getElementById("overlay2");
      let overlay3 = document.getElementById("overlay3");

      overlay.textContent = "";
      overlay2.textConent = "";
      overlay3.textConent = "";
      
      let editorRect = this.targetElement.getBoundingClientRect();

      [...recent, ...others].forEach(token => {
        let [xOff, yOff] = [-1, -1];
        const tokenOverlay = document.createElement('div');
        tokenOverlay.classList.add('overlay-word-1');
        tokenOverlay.textContent = token.text
        tokenOverlay.style.left = `${token.rect.left - editorRect.left -xOff}px`;
        tokenOverlay.style.top = `${token.rect.top - editorRect.to - yOff}px`; // Position at bottom of text

        overlay.appendChild(tokenOverlay)

        [xOff, yOff] = [10, 1];
        const tokenOverlay2 = document.createElement('div');
        tokenOverlay2.classList.add('overlay-word-2');
        tokenOverlay2.textContent = token.text
        tokenOverlay2.style.left = `${token.rect.left - editorRect.left - xOff}px`;
        tokenOverlay2.style.top = `${token.rect.top - editorRect.top - yOff}px`; // Position at bottom of text

        overlay2.appendChild(tokenOverlay2)

        [xOff, yOff] = [4, -1];
        const tokenOverlay3 = document.createElement('div');
        tokenOverlay3.classList.add('overlay-word-3');
        tokenOverlay3.textContent = token.text
        tokenOverlay3.style.left = `${token.rect.left - editorRect.left - xOff}px`;
        tokenOverlay3.style.top = `${token.rect.top - editorRect.top - yOff}px`; // Position at bottom of text

        overlay3.appendChild(tokenOverlay3)
      })
    }

    mistakeMarkup(mispelledTokens, correctTokens) {
      
    }

    // Find new tokens that weren't in the previous set
    findNewTokens(previous, current, hash) {
      // const hash = (item) => {return `${item.rect.left}-${item.rect.top}-${item.startIndex}`}

      // Create a simple hash of each previous misspelling for comparison
      const previousHashes = previous.map(hash);
      
      // Filter current misspellings to only those not in previous
      const newTokens = current.filter(item => !previousHashes.includes(hash(item)));
      const oldTokens = current.filter(item => previousHashes.includes(hash(item)));

      console.log('prev hashes', previousHashes);
      console.log('new', newTokens.map(hash))
      // console.log({newTokens, oldTokens, previous, current})

      return [newTokens, oldTokens];
    }

    findNewCharacters(prevTokens, newTokens) {
      const locationHash = (item) => {return `${item.rect.left}-${item.rect.top}`}
      const textHash = (item) => {return `${item?.text}`}

      const lookup = {};
      prevTokens.forEach(token => {
        lookup[locationHash(token)] = token;
      });

      let updatedTokens = [];
      
      newTokens.forEach(token => {
        const original = lookup[locationHash(token)];
        console.log(`${original?.text} -> ${token?.text}`, token);
        if (original != null && token != null && textHash(original) != textHash(token)) {
          const diffs = diffTokens(original, token);
          updatedTokens = updatedTokens.concat(diffs);
        }
      });

        return updatedTokens;
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

  const vis = new Editor({
    checkDelay: 500,
    squiggleColor: 'red'
  });
    
const editor = document.querySelector('#editor');
if (editor) {
  vis.setElement(editor);
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