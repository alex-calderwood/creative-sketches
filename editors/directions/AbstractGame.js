/**
 * AbstractGame - Base class defining the interface required by MetaGame
 * 
 * Extend this class to create a MetaGame-compatible editor.
 * All methods must be implemented for proper integration.
 */

export class AbstractGame {
  constructor() {
    this.save = null;
    this.documentId = null;
  }

  /**
   * Initialize the game with save data
   * 
   * Called by MetaGame after setting up save/document infrastructure.
   * This is where you should:
   * - Store the save and documentId references
   * - Load content from the document
   * - Set up your editor's DOM elements
   * - Attach event listeners
   * 
   * @param {Object} options - Initialization options
   * @param {GameplaySave} [options.save] - Save instance containing all documents
   * @param {string} [options.documentId] - ID of the current document
   * 
   * @example
   * async initialize(options = {}) {
   *   this.save = options.save || null;
   *   this.documentId = options.documentId || null;
   *   
   *   if (this.save && this.documentId) {
   *     const doc = this.save.getDocument(this.documentId);
   *     const content = doc.getField('content');
   *     this.editor.innerText = content;
   *   }
   *   
   *   this.setupEventListeners();
   * }
   */
  async initialize(options = {}) {
    throw new Error('initialize() must be implemented');
  }

  /**
   * Save the current editor state
   * 
   * Called when:
   * - User clicks "Save" button (screenshot captured automatically by MetaGameControls)
   * - Autosave triggers (no screenshot)
   * 
   * Must return an object with a 'text' property containing
   * the content to save to the document.
   * 
   * @returns {Object} State object with text property
   * @returns {string} return.text - Content to save to document
   * 
   * @example
   * saveState() {
   *   return {
   *     text: this.editor.innerText
   *   };
   * }
   * 
   * @example
   * // For complex editors with structured data
   * saveState() {
   *   const elements = this.getElements();
   *   return {
   *     text: JSON.stringify(elements),
   *     elements: elements
   *   };
   * }
   */
  saveState() {
    throw new Error('saveState() must be implemented');
  }

  /**
   * Performance/settings interface for the Settings UI
   * 
   * Used by MetaGameControls to display and modify editor settings.
   * Return an object with getAllSettings() and updateSetting() methods.
   * 
   * If your editor has no settings, return empty implementations:
   * 
   * @returns {Object} Performance object
   * @returns {Function} return.getAllSettings - Returns settings object
   * @returns {Function} return.updateSetting - Updates a setting value
   * 
   * @example
   * // No settings
   * get performance() {
   *   return {
   *     getAllSettings: () => ({}),
   *     updateSetting: () => {}
   *   };
   * }
   * 
   * @example
   * // With settings
   * get performance() {
   *   return {
   *     getAllSettings: () => ({
   *       fontSize: {
   *         name: 'Font Size',
   *         type: 'number',
   *         value: this.fontSize,
   *         description: 'Editor font size in pixels'
   *       },
   *       autoSave: {
   *         name: 'Auto Save',
   *         type: 'boolean',
   *         value: this.autoSave,
   *         description: 'Automatically save changes'
   *       },
   *       theme: {
   *         name: 'Theme',
   *         type: 'select',
   *         value: this.theme,
   *         options: ['light', 'dark', 'blue'],
   *         description: 'Editor color theme'
   *       }
   *     }),
   *     updateSetting: (name, value) => {
   *       if (name === 'fontSize') {
   *         this.fontSize = value;
   *         this.applyFontSize();
   *       }
   *       if (name === 'autoSave') {
   *         this.autoSave = value;
   *       }
   *       if (name === 'theme') {
   *         this.theme = value;
   *         this.applyTheme();
   *       }
   *     }
   *   };
   * }
   */
  get performance() {
    throw new Error('performance getter must be implemented');
  }
}

/**
 * Setting type definitions:
 * 
 * @typedef {Object} Setting
 * @property {string} name - Display name for the setting
 * @property {'boolean'|'number'|'string'|'select'} type - Type of the setting
 * @property {*} value - Current value of the setting
 * @property {Array<*>} [options] - Available options (required for 'select' type)
 * @property {string} [description] - Optional tooltip description
 */
