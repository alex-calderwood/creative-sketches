class Editor {
    constructor(options = {}) {
      this.options = {
        typewriterMode: false, // if true, doesn't allow insertions within the text, only at the end
        ...options
      };

      
      this.targetElement = null;
      this.textState = {
        tokens: [],
      }
      this.eventTarget = new EventTarget();

    }

    // Set the editor element
    setElement(element) {
      if (!element) return;
      
      // Clear previous element's listener if any
      if (this.targetElement) {
        this.targetElement.removeEventListener('beforeinput', this.blockDeletions.bind(this));
      }
      
      // Set new element and initialize
      this.targetElement = element;
      
      // Set up event listeners for content changes
      element.addEventListener('beforeinput', this.blockDeletions.bind(this));
      
      return this;
    }

    blockDeletions(event) {
      const inputEvent = event instanceof InputEvent ? event : null;
      console.log('inputEvent', inputEvent.inputType);
      if (!(inputEvent && inputEvent.inputType)) {
        return;
      }

      let preventEventAndShowPrevention = (event) => {
        event.preventDefault();
        this.showInkBlob();
        return;
      }

      // Block any input when text is highlighted (selection is not collapsed)
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        return preventEventAndShowPrevention(event);
      }

      // Block delete operations
      let isDeleteOperation = inputEvent.inputType.startsWith("delete") ||
          inputEvent.inputType === "deleteContentBackward" ||
          inputEvent.inputType === "deleteContentForward" ||
          inputEvent.inputType === "deleteByCut";

      // Block any delete operations
      if (isDeleteOperation) {
        return preventEventAndShowPrevention(event);
      }

      // When in typewriter mode, we want to block any insert operations except those at the
      // end of the document.
      if (this.options.typewriterMode) {
        let isValidTypewriterOperation = false;
        let isInsert = inputEvent.inputType.startsWith("insert");
        if (isInsert) {
          isValidTypewriterOperation = this.isAtEndOfDocument();
        }

        if (!isValidTypewriterOperation) {
          return preventEventAndShowPrevention(event);
        }
      }
    }

    // Check if the cursor is at the very end of the document
    isAtEndOfDocument() {
      const selection = window.getSelection();
      if (!selection || !selection.isCollapsed || !this.targetElement) {
        return false;
      }

      // Create a range from cursor to end of element
      const range = document.createRange();
      range.setStart(selection.anchorNode, selection.anchorOffset);
      range.setEndAfter(this.targetElement.lastChild || this.targetElement);

      // If there's no text after the cursor, we're at the end
      let isAtEnd = range.toString().trim() === '';

      console.log({isAtEnd, range: range.toString(), isAtEndOfDocument: range.toString() === ''});
      return isAtEnd;
    }

    // Show an ink blob at the cursor position to indicate something happened there
    showInkBlob() {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      // Random offset close to cursor, spanning its height
      const offsetXRange = 10;
      const offsetX = (Math.random() - 0.5) * offsetXRange;
      const offsetY = Math.random() * rect.height;
      const rotation = Math.random() * 360;
      const scaleRange = [0.1, 0.40];
      const scale = Math.random() * (scaleRange[1] - scaleRange[0]) + scaleRange[0];
      const width = 30;
      const height = 30;


      // Create ink blob SVG
      const blob = document.createElement('div');
      blob.className = 'ink-blob';
      blob.innerHTML = `<svg viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
        <path d="M15 3 Q20 8 18 12 Q22 14 20 18 Q24 20 18 24 Q16 28 12 24 Q6 26 8 20 Q4 18 8 14 Q5 10 10 8 Q8 4 15 3 Z" fill="black"/>
      </svg>`;
      blob.style.cssText = `
        position: fixed;
        left: ${rect.left - width/2 + offsetX}px;
        top: ${rect.top - height/2 + offsetY}px;
        pointer-events: none;
        transform: scale(${scale}) rotate(${rotation}deg);
        animation: ink-splat 0.4s ease-out forwards;
      `;

      document.body.appendChild(blob);
    }
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


const vis = new Editor({
  // squiggleColor: 'red'
  typewriterMode: false,
});
    
const editor = document.querySelector('#editor');
if (editor) {
  vis.setElement(editor);
}
