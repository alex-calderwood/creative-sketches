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

    let fragileNodeIndex = 0;
    
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
          fragileNodeIndex: fragileNodeIndex++,
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
 * Compares two tokens and returns only the differences with positioning data.
 * Uses the diff library to identify changed segments, ignoring unchanged text.
 * Returns added segments from the new token and their positions.
 */
function diffTokens(oldToken, newToken) {
  // Get the text differences using JsDiff
  const textDiffs = Diff.diffChars(oldToken.text, newToken.text);
  
  // Result array - only contains differences
  const diffResult = [];
  
  // Track current position in the node, starting from the token's start position
  let currentIndex = newToken.startIndex;
  
  // Process each part of the diff
  textDiffs.forEach(part => {
    const { added, removed, value } = part;
    
    // If this part is added (present in new token but not in old token)
    if (added && value.length > 0) {
      const partStartIndex = currentIndex;
      const partEndIndex = currentIndex + value.length;
      
      // Create a DOM range for this part to get precise rect
      const range = document.createRange();
      range.setStart(newToken.node, partStartIndex);
      range.setEnd(newToken.node, partEndIndex);
      const rect = range.getBoundingClientRect();
      
      diffResult.push({
        text: value,
        rect: {
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.width,
          height: rect.height,
          absoluteTop: rect.top + window.scrollY,
          absoluteLeft: rect.left + window.scrollX
        },
        element: newToken.element,
        node: newToken.node,
        fragileNodeIndex: newToken.fragileNodeIndex,
        startIndex: partStartIndex,
        endIndex: partEndIndex
      });
    }
    
    // Move index past this part (if it's in the new token)
    if (!removed) {
      currentIndex += value.length;
    }
  });
  
  return diffResult;
}