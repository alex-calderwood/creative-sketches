/**
 * Game wrapper for concrete-2 editor
 * Provides interface for MetaGame integration
 */

export class Game {
  constructor(config = {}) {
    this.grid = null;
    this.initialized = false;
    this.save = null;
    this.documentId = null;
    this.charWidth = 18;
    this.charHeight = 30;
    this.elementIdCounter = 0;

    this.initialize(config)
  }

  /**
   * Initialize the game with optional save and document
   * @param {Object} config - Initialization options
   * @param {GameplaySave} config.save - The save instance
   * @param {string} config.documentId - The document ID to load
   */
  async initialize(config = {}) {
    this.config = {
      verticalCopy: true,
      horizontalCopy: true,
      enableGrid: false,
      opaque: true,
      ...config,
    }


    console.log("config", this.config, config)

    this.settings = [
      { 
        name: 'verticalCopy', 
        type: 'boolean', 
        description: 'Create vertical copies of text elements'
      },
      { 
        name: 'horizontalCopy', 
        type: 'boolean', 
        description: 'Create horizontal copies of text elements'
      },
      { 
        name: 'enableGrid', 
        type: 'boolean', 
        description: 'Snap text elements to grid'
      },
      { 
        name: 'opaque', 
        type: 'boolean', 
        description: 'Make wall elements opaque (blocks interaction)'
      }
    ];

    this.save = config.save || null;
    this.documentId = config.documentId || null;
    
    this.grid = document.getElementById('editor');
    if (!this.grid) {
      throw new Error('Grid element not found');
    }
    
    // Measure character dimensions
    this.measureCharDimensions();
    
    // Setup grid click handler
    this.attachGridClickHandler();
    
    // Load content from save if available
    if (this.save && this.documentId) {
      const document = this.save.getDocument(this.documentId);
      if (document) {
        const content = document.getField('content');
        if (content) {
          this.loadState(content);
        }
      }
    }
    
    this.initialized = true;
  }
  
  /**
   * Measure character dimensions based on actual rendered text
   */
  measureCharDimensions() {
    // Create a temporary element with the same class as editable elements
    const temp = document.createElement('div');
    temp.className = 'editable-element';
    temp.style.position = 'absolute';
    temp.style.visibility = 'hidden';
    temp.textContent = 'M'; // Use M as it's typically the widest character
    
    this.grid.appendChild(temp);
    
    // Get computed styles to read actual CSS values
    const computedStyle = window.getComputedStyle(temp);
    const rect = temp.getBoundingClientRect();
    
    this.charWidth = Math.ceil(rect.width);
    this.charHeight = Math.ceil(parseFloat(computedStyle.lineHeight)) || rect.height;
    
    this.grid.removeChild(temp);
  }


  /**
   * Attach click handler to grid for creating new elements
   */
  attachGridClickHandler() {
    const charHeight = this.charHeight;
    const charWidth = this.charWidth;

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
      
      const curU = this.config.enableGrid ? Math.floor(x / charWidth) : x;
      const curV = this.config.enableGrid ? Math.floor(y / charHeight) : y;
      
      const element = document.createElement('div');
      element.className = 'editable-element';
      element.style.left = `${curU * (this.config.enableGrid ? charWidth : 1)}px`;
      element.style.top = `${curV * (this.config.enableGrid ? charHeight : 1)}px`;
      element.contentEditable = true;
      element.dataset.elementId = `element-${this.elementIdCounter++}`;
      
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
  loadState(stateJson) {
    if (!this.grid) return;
    
    try {
      const state = JSON.parse(stateJson);
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
        element.dataset.elementId = `element-${this.elementIdCounter++}`;
        
        // Attach event listeners
        this.attachElementListeners(element);
        
        this.grid.appendChild(element);
      });
    } catch (error) {
      console.error('Error loading state:', error);
    }
  }

  /**
   * Attach event listeners to an editable element
   * @param {HTMLElement} element - The element to attach listeners to
   */
  attachElementListeners(element) {
    const charHeight = this.charHeight;
    
    element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const newElement = document.createElement('div');
        newElement.className = 'editable-element';
        newElement.style.left = element.style.left;
        newElement.style.top = `${parseInt(element.style.top) + charHeight}px`;
        newElement.contentEditable = true;
        newElement.dataset.elementId = `element-${this.elementIdCounter++}`;
        this.attachElementListeners(newElement);
        this.grid.appendChild(newElement);
        newElement.focus();
      }
    });

    element.addEventListener('input', (e) => {
      // create another pseudo element that is not selectable, mirroring this word across the 
      // entire screen
      const text = element.textContent;
      const elementId = element.dataset.elementId;
      
      // Remove existing wall elements for this specific element
      const existingWallElements = this.grid.querySelectorAll(`.wall-element[data-parent-id="${elementId}"]`);
      existingWallElements.forEach(el => el.remove());
      
      // Only create wall if there's text
      if (!text || !text.trim()) {
        return;
      }
    
      // Get element position
      const elementLeft = parseInt(element.style.left) || 0;
      const elementTop = parseInt(element.style.top) || 0;
      
      // Calculate text dimensions
      const charWidth = this.charWidth;
      const charHeight = this.charHeight;
      // const textWidth = (text.length) * charWidth; // +1 for spacing
      // get the actual textWidth using getBoundingClientRect
      const textWidth = element.getBoundingClientRect().width;
      
      // Calculate how many copies we need
      const gridWidth = this.grid.offsetWidth;
      const gridHeight = this.grid.offsetHeight;

      const numX = Math.floor(gridWidth / textWidth);
      const numY = Math.floor(gridHeight / charHeight);
      
      // Start from the next position after current text
      let startLeft = elementLeft;
      let startTop = elementTop;

      if (this.config.verticalCopy) {
        // Create grid of duplicate elements
        for (let top = startTop - numY * charHeight; top < gridHeight; top += charHeight) {

          let left = startLeft;
        
          const wallElement = document.createElement('div');
          wallElement.className = 'wall-element';
          if (this.config.opaque) { wallElement.classList.add('opaque'); }
          wallElement.textContent = text;
          wallElement.style.left = `${left}px`;
          wallElement.style.top = `${top}px`;
          wallElement.dataset.parentId = elementId;
          
          this.grid.insertBefore(wallElement, this.grid.firstChild);
        }
      }

      console.log({startLeft, textWidth, charWidth})

      if (this.config.horizontalCopy) {
        // Create grid of duplicate elements
        for (let left = startLeft - numX * textWidth; left < gridWidth; left += textWidth) {
          let top = startTop;
          
          const wallElement = document.createElement('div');
          wallElement.className = 'wall-element';
          wallElement.textContent = text;
          wallElement.style.left = `${left}px`;
          wallElement.style.top = `${top}px`;
          wallElement.dataset.parentId = elementId;
          
          this.grid.insertBefore(wallElement, this.grid.firstChild);
        }
      }
    });
  }

  /**
   * Reconstruct spatial text from positioned elements
   */
  reconstructSpatialText(elementsData) {
    const charHeight = this.charHeight;
    const charWidth = this.charWidth;
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
      getAllSettings: () => {
        const result = {};
        this.settings.forEach((setting) => {
          result[setting.name] = {
            ...setting,
            value: this.config[setting.name]
          };
        });
        return result;
      },
      
      updateSetting: (name, value) => {
        if (!(name in this.config)) {
          const validNames = Object.keys(this.config).join(', ');
          throw new Error(`Invalid setting name: ${name}. Valid names: ${validNames}`);
        }

        this.config[name] = value;
        
        // Refresh all wall elements to apply new settings
        if (this.grid) {
          const editableElements = this.grid.querySelectorAll('.editable-element');
          editableElements.forEach(element => {
            // Trigger input event to recreate wall elements with new settings
            element.dispatchEvent(new Event('input'));
          });
        }
      }
    };
  }
}
