/**
 * Game wrapper for concrete-2 editor
 * Provides interface for MetaGame integration
 */

export class Game {
  constructor() {
    this.grid = null;
    this.initialized = false;
    this.save = null;
    this.documentId = null;
  }

  /**
   * Initialize the game with optional save and document
   * @param {Object} options - Initialization options
   * @param {GameplaySave} options.save - The save instance
   * @param {string} options.documentId - The document ID to load
   */
  async initialize(options = {}) {
    this.save = options.save || null;
    this.documentId = options.documentId || null;
    
    this.grid = document.getElementById('editor');
    if (!this.grid) {
      throw new Error('Grid element not found');
    }
    
    // Setup grid click handler
    this.attachGridClickHandler();
    
    // MetaGame passes the saved document state (or level seed) as initialState.
    if (options.initialState) {
      this.loadState(options.initialState);
    }
    
    this.initialized = true;
  }

  /**
   * Attach click handler to grid for creating new elements
   */
  attachGridClickHandler() {
    const ENABLE_GRID = true;
    const charHeight = 30;
    const charWidth = Math.floor(charHeight * 0.6);

    this.grid.addEventListener('click', (event) => {
      // Check if we clicked on an existing editable element
      const clickedElement = event.target.closest('.editable-element');
      if (clickedElement) {
        if (document.activeElement === clickedElement) {
          return;
        }
        
        const range = document.caretRangeFromPoint(event.clientX, event.clientY);
        if (range) {
          const selection = window.getSelection();
          selection.removeAllRanges();
          selection.addRange(range);
        }
        clickedElement.focus();
        return;
      }
      
      const rect = this.grid.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      const curU = ENABLE_GRID ? Math.floor(x / charWidth) : x;
      const curV = ENABLE_GRID ? Math.floor(y / charHeight) : y;
      
      const element = document.createElement('div');
      element.className = 'editable-element';
      element.style.left = `${curU * (ENABLE_GRID ? charWidth : 1)}px`;
      element.style.top = `${curV * (ENABLE_GRID ? charHeight : 1)}px`;
      element.contentEditable = true;
      
      this.attachElementListeners(element);
      this.grid.appendChild(element);
      element.focus();
    });
  }

  /**
   * Save the current state of the editor
   * @returns {Object} State object with text content
   */
  saveState() {
    if (!this.grid) return null;
    
    // Collect all editable elements and their positions
    const elements = Array.from(this.grid.querySelectorAll('.editable-element'));
    const elementsData = elements.map(el => ({
      left: el.style.left,
      top: el.style.top,
      text: el.textContent
    }));
    
    const readableText = this.reconstructSpatialText(elementsData);
    
    return {
      text: readableText,
      elements: elementsData
    };
  }

  /**
   * Load state into the editor
   * @param {string} stateJson - JSON string of saved state
   */
  loadState(state) {
    if (!this.grid || !state) return;

    try {
      const elementsData = state.elements;
      
      if (!elementsData) {
        console.warn('No elements data in state');
        return;
      }
      
      // Clear existing elements
      this.grid.innerHTML = '';
      
      // Create elements from saved data
      elementsData.forEach(data => {
        const element = document.createElement('div');
        element.className = 'editable-element';
        element.style.left = data.left;
        element.style.top = data.top;
        element.contentEditable = true;
        element.textContent = data.text;
        
        // Attach event listeners
        this.attachElementListeners(element);
        
        this.grid.appendChild(element);
      });
    } catch (error) {
      console.error('Error loading state:', error);
    }
  }

  denyFocus(target) {
    console.log("deny", target, this);
      let textContent = target?.textContent;
      if (!textContent) return;
      let spaces = (textContent.match(/ /g) || []).length;
      if (spaces >= 3) {

        // Create hidden div to capture subsequent input
        const hiddenDiv = document.createElement('div');
        hiddenDiv.contentEditable = true;
        hiddenDiv.style.position = 'absolute';
        hiddenDiv.style.opacity = '0';
        hiddenDiv.style.pointerEvents = 'none';
        
        // Add to DOM and focus
        document.querySelector("#editor").appendChild(hiddenDiv);
        // console.log(target.textContent)
        hiddenDiv.focus({ preventScroll: true });
    }
  }

  /**
   * Attach event listeners to an editable element
   * @param {HTMLElement} element - The element to attach listeners to
   */
  attachElementListeners(element) {
    const charHeight = 30;
    
    element.addEventListener('keydown', (e) => {
      if (e.key === ' ') {
          this.denyFocus(e.target);
      }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const newElement = document.createElement('div');
        newElement.className = 'editable-element';
        newElement.style.left = element.style.left;
        newElement.style.top = `${parseInt(element.style.top) + charHeight}px`;
        newElement.contentEditable = true;
        this.attachElementListeners(newElement);
        this.grid.appendChild(newElement);
        newElement.focus();
      }
    })
  }

  /**
   * Reconstruct spatial text from positioned elements
   */
  reconstructSpatialText(elementsData) {
    const charHeight = 30, charWidth = 18;
    const items = elementsData
      .filter(el => el.text.trim())
      .map(el => ({ top: parseInt(el.top), left: parseInt(el.left), text: el.text }));
    
    if (!items.length) return '';
    
    const minTop = Math.min(...items.map(p => p.top));
    const minLeft = Math.min(...items.map(p => p.left));
    const gridItems = items.map(p => ({
      line: Math.floor((p.top - minTop) / charHeight),
      col: Math.floor((p.left - minLeft) / charWidth),
      text: p.text
    }));
    
    const lines = Array(Math.max(...gridItems.map(i => i.line)) + 1).fill('').map((_, lineNum) => {
      const lineItems = gridItems.filter(i => i.line === lineNum).sort((a, b) => a.col - b.col);
      let line = '', col = 0;
      lineItems.forEach(item => {
        line += ' '.repeat(Math.max(0, item.col - col)) + item.text;
        col = item.col + item.text.length;
      });
      return line;
    });
    
    return lines.join('\n');
  }

  /**
   * Placeholder for performance settings (required by MetaGameControls)
   */
  get performance() {
    return {
      getAllSettings: () => ({}),
      updateSetting: () => {}
    };
  }
}
