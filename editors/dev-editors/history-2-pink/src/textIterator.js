const BLOCK_TAGS = /^(DIV|P|LI|H[1-6]|BLOCKQUOTE|PRE)$/i;

function isBlock(node) {
  return node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.test(node.tagName);
}

/**
 * Walk the DOM from root, counting text length with \n for block boundaries.
 * Stops when reaching targetNode/targetOffset. If no target, counts everything.
 */
export function getTextNodeAtOffset(root, targetOffset) {
  let length = 0;
  let result = null;
  let isOnFreshLine = true;

  function walk(node) {
    if (result) return;
    if (node.nodeName === 'BR') { length += 1; isOnFreshLine = true; return; }
    if (isBlock(node) && !isOnFreshLine && length > 0) { length += 1; isOnFreshLine = true; }
    if (node.nodeType === Node.TEXT_NODE) {
      if (length + node.nodeValue.length >= targetOffset) {
        result = { node, offset: targetOffset - length };
        return;
      }
      length += node.nodeValue.length;
      isOnFreshLine = false;
      return;
    }
    for (const child of node.childNodes) {
      if (result) return;
      walk(child);
    }
  }

  walk(root);
  return result;
}

export function getGlobalTextOffset(root, targetNode, targetOffset) {
  let length = 0;
  let found = false;
  let isOnFreshLine = true;

  function walk(node) {
    if (found) return;
    if (node.nodeName === 'BR') { length += 1; isOnFreshLine = true; return; }
    if (isBlock(node) && !isOnFreshLine && length > 0) { length += 1; isOnFreshLine = true; }

    if (node === targetNode && node.nodeType === Node.TEXT_NODE) {
      length += targetOffset;
      found = true;
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      length += node.nodeValue.length;
      isOnFreshLine = false;
      return;
    }

    const children = node.childNodes;
    for (let i = 0; i < children.length; i++) {
      if (found) return;
      if (node === targetNode && i === targetOffset) {
        found = true;
        return;
      }
      walk(children[i]);
    }
  }

  walk(root);
  return length;
}

/**
 * Get the full text of a contenteditable, with \n for block boundaries.
 */
export function getEditableText(root) {
  let text = '';
  let isOnFreshLine = true;
  function walk(node) {
    if (node.nodeName === 'BR') { text += '\n'; isOnFreshLine = true; return; }
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.nodeValue;
      isOnFreshLine = false;
      return;
    }
    if (isBlock(node) && !isOnFreshLine && text.length > 0) { text += '\n'; isOnFreshLine = true; }
    for (const child of node.childNodes) walk(child);
  }
  walk(root);
  return text;
}

/**
 * Iterates through all words in a contenteditable element
 */
export function iterateContentEditableWords(editableElement, options = {}) {
    const defaultOptions = {
      wordSeparator: /\s+/,
      includeEmpty: false
    };

    let overlayRect = document.getElementById('overlay').getBoundingClientRect();
    
    const config = { ...defaultOptions, ...options };
    const words = [];

    function processTextNode(textNode) {
      const text = textNode.nodeValue;
      const parentElement = textNode.parentElement;
      const globalOffset = getGlobalTextOffset(editableElement, textNode, 0);
      
      const tokens = text.split(config.wordSeparator);
      
      let currentIndex = 0;
      for (const token of tokens) {
        if (token.length === 0 && !config.includeEmpty) continue;
        
        const localStart = text.indexOf(token, currentIndex);
        if (localStart === -1) continue;
        
        const localEnd = localStart + token.length;
        currentIndex = localEnd;
        
        const wordInfo = {
          text: token,
          parent: parentElement,
          node: textNode,
          localStart,
          localEnd,
          startIndex: globalOffset + localStart,
          endIndex: globalOffset + localEnd,
        };

        // let parentOffset = parentElement.getBoundingClientRect();
        
        // bounding box information
        try {
          const range = document.createRange();
          range.setStart(textNode, localStart);
          range.setEnd(textNode, localEnd);
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
          // In case there's an issue with creating the range
          wordInfo.rect = null;
          console.log("error creating range")
        }
        
        words.push(wordInfo);
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
      
      // Traverse child nodes
      for (const childNode of node.childNodes) {
        traverseNodes(childNode);
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
    range.setStart(wordInfo.node, wordInfo.localStart);
    range.setEnd(wordInfo.node, wordInfo.localEnd);
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

export function getMatchingToken(words, token) {
  return words.find(w => w.startIndex <= token.startPos && w.endIndex >= token.endPos);
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