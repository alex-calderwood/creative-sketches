/**
 * Iterates through all words in a contenteditable element
 * @param {HTMLElement} editableElement - The contenteditable element to process
 * @param {Object} options - Configuration options
 * @param {RegExp} [options.wordSeparator=/\s+/] - Regular expression to split text into words
 * @param {boolean} [options.includeEmpty=false] - Whether to include empty words
 * @returns {Array} Array of word objects with text, element, startIndex, and endIndex
 */
function iterateContentEditableWords(editableElement, options = {}) {
    const defaultOptions = {
      wordSeparator: /\s+/,
      includeEmpty: false
    };
    
    const config = { ...defaultOptions, ...options };
    const words = [];
    
    function processTextNode(textNode) {
      const text = textNode.nodeValue;
      const parentElement = textNode.parentElement;
      
      // Split the text into words
      const tokens = text.split(config.wordSeparator);
      
      let currentIndex = 0;
      for (const token of tokens) {
        if (token.length === 0 && !config.includeEmpty) continue;
        
        const startIndex = text.indexOf(token, currentIndex);
        if (startIndex === -1) continue;
        
        const endIndex = startIndex + token.length;
        currentIndex = endIndex;
        
        const wordInfo = {
          text: token,
          element: parentElement,  // The parent HTML element
          node: textNode,          // The actual text node containing the text
          startIndex: startIndex,  // Index within the text node
          endIndex: endIndex       // Index within the text node
        };
        
        // bounding box information
        try {
          const range = document.createRange();
          range.setStart(textNode, startIndex);
          range.setEnd(textNode, endIndex);
          const rect = range.getBoundingClientRect();
          
          wordInfo.rect = {
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            absoluteTop: rect.top + window.scrollY,
            absoluteLeft: rect.left + window.scrollX
          };
        } catch (e) {
          // In case there's an issue with creating the range
          wordInfo.rect = null;
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