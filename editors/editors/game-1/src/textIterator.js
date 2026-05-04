/**
 * Text Iterator V2 
 * Iterates through a contenteditable element. Returns a list of word objects:
 * 
 * {
        text,                  // word text
        parent,                // parent HTML element
        node,                  // text node containing the word
        startIndex,            // word start offset within the text node
        endIndex,              // word end offset within the text node
        rect,                  // bounding box, relative to #overlay
        type: word
    }
    or 
    {
      type: 'newline',         // logical line break (\n, <br>, or block boundary)
    }
    
 * 
 * Iterates through all words in a contenteditable element
 * @param {HTMLElement} editableElement - The contenteditable element to process
 * @param {Object} options - Configuration options
 * @param {RegExp} [options.wordSeparator=/\s+/] - Regular expression to split text into words
 * @param {boolean} [options.includeEmpty=false] - Whether to include empty words
 * @param {boolean} [options.includeNewlines=false] - When true, interleaves `{ type: 'newline' }`
 *   markers between words wherever a logical line break occurs (\n in a text node, a <br>
 *   element, or a block-level element boundary). Word objects do not have a `type` field.
 * @returns {Array} Array of word objects with text, element, startIndex, and endIndex
 *   (and possibly `{ type: 'newline' }` markers when includeNewlines is true)
 */
export function iterateContentEditableWords(editableElement, options = {}) {
    const defaultOptions = {
      wordSeparator: /\s+/,
      includeEmpty: false,
      includeNewlines: false,
    };

    const BLOCK_TAGS = new Set(['DIV', 'P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE']);

    let overlayRect = document.getElementById('overlay').getBoundingClientRect();
    
    const config = { ...defaultOptions, ...options };
    const words = [];

    function lastIsNewline() {
      const last = words[words.length - 1];
      return last && last.type === 'newline';
    }

    function pushNewline() {
      words.push({ type: 'newline' });
    }

    function pushWord(textNode, parentElement, startIndex, endIndex, tokenText) {
      const wordInfo = {
        text: tokenText,
        parent: parentElement,
        node: textNode,
        startIndex,
        endIndex,
        type: 'word',
      };

      try {
        const range = document.createRange();
        range.setStart(textNode, startIndex);
        range.setEnd(textNode, endIndex);
        const rect = range.getBoundingClientRect();

        let left = rect.left - overlayRect.left;
        let top = rect.top - overlayRect.top;

        wordInfo.rect = {
          // https://sentry.io/answers/how-do-i-get-the-position-x-y-of-an-html-element/
          top: top,
          left: left,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
          relative: {
            top: rect.top,
            left: rect.left,
          },
        };
      } catch (e) {
        wordInfo.rect = null;
      }

      words.push(wordInfo);
    }
    
    function processTextNode(textNode) {
      const text = textNode.nodeValue;
      const parentElement = textNode.parentElement;
      
      if (config.includeNewlines) {
        // Walk text emitting words and newline markers in order.
        const re = /\n|\S+/g;
        let m;
        while ((m = re.exec(text)) !== null) {
          if (m[0] === '\n') {
            pushNewline();
          } else {
            pushWord(textNode, parentElement, m.index, m.index + m[0].length, m[0]);
          }
        }
        return;
      }

      // Split the text into words
      const tokens = text.split(config.wordSeparator);
      
      let currentIndex = 0;
      for (const token of tokens) {
        if (token.length === 0 && !config.includeEmpty) continue;
        
        const startIndex = text.indexOf(token, currentIndex);
        if (startIndex === -1) continue;
        
        const endIndex = startIndex + token.length;
        currentIndex = endIndex;

        pushWord(textNode, parentElement, startIndex, endIndex, token);
      }
    }
    
    // Recursive function to traverse all nodes
    function traverseNodes(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        processTextNode(node);
        return;
      }
      
      // Skip script and style elements
      if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') {
        return;
      }

      if (config.includeNewlines && node.tagName === 'BR') {
        pushNewline();
        return;
      }

      const isBlock = config.includeNewlines && node !== editableElement && BLOCK_TAGS.has(node.tagName);

      // Block start: emit newline if we already have content and the previous item isn't already a newline
      if (isBlock && words.length > 0 && !lastIsNewline()) {
        pushNewline();
      }
      
      // Traverse child nodes
      for (const childNode of node.childNodes) {
        traverseNodes(childNode);
      }

      // Block end: emit a newline so a following sibling text node starts a new line
      if (isBlock && !lastIsNewline()) {
        pushNewline();
      }
    }
    
    traverseNodes(editableElement);
    
    return words;
  }
  
  /**
  * Utility function to create a Range for a specific word
  * @param {Object} wordInfo - Word information from iterateContentEditableWords
  * @returns {Range} - DOM Range object pointing to the word
  */
  function createRangeForWord(wordInfo) {
    const range = document.createRange();
    // This is critical - we must use the text node itself, not its parent element
    range.setStart(wordInfo.node, wordInfo.startIndex);
    range.setEnd(wordInfo.node, wordInfo.endIndex);
    return range;
  }
  
  /**
  * Gets the bounding client rect for a specific word
  * @param {Object} wordInfo - Word information from iterateContentEditableWords
  * @returns {DOMRect} - DOMRect object with the word's bounding box
  */
  function getWordBoundingRect(wordInfo) {
    const range = createRangeForWord(wordInfo);
    return range.getBoundingClientRect();
  }
  
  /**
  * Gets detailed position information for a word
  * @param {Object} wordInfo - Word information from iterateContentEditableWords
  * @returns {Object} - Object containing the word's bounding box and position details
  */
  function getWordPositionDetails(wordInfo) {
    const range = createRangeForWord(wordInfo);
    const rect = range.getBoundingClientRect();
  
    return {
      rect: rect,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left,
      width: rect.width,
      height: rect.height,
      // Get position relative to the document
      absoluteTop: rect.top + window.scrollY,
      absoluteLeft: rect.left + window.scrollX
    };
  }

// Find new misspellings that weren't in the previous set
export function newWords(previous, current) {
  if (!previous) return current;
  if (!current) return [];

  const hash = (item) => {return `${item.text}-${item.startIndex}-${item.endIndex}`}
  // Create a simple hash of each previous word for comparison
  const previousHashes = previous.map(hash);
  
  // Filter current words to only those not in previous
  return current.filter(item => {
    return !previousHashes.includes(hash(item));
  });  
}