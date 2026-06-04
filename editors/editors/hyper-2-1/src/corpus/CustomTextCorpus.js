import { TextCorpus } from './TextCorpus.js';

/**
 * CustomTextCorpus extends TextCorpus to allow users to provide custom text
 * or select from a collection of example texts.
 */
export class CustomTextCorpus extends TextCorpus {
  static INDEX_PATH = window.BASE_PATH + '/assets/corpora/index.json';

  constructor(source = 'custom', { exclude = [], include = [] } = {}) {
    super(source);
    this.exclude = exclude;
    this.include = include;
    this.texts = [];
  }

  /**
   * Load texts from JSON file
   * @returns {Promise<void>}
   */
  async loadTextsFromJSON() {
    try {
      const response = await fetch(CustomTextCorpus.INDEX_PATH);
      const data = await response.json();
      
      // Filter out excluded IDs
      let filtered = data.texts.filter(
        text => !this.exclude.includes(text.id)
      );
      
      // Add included examples
      filtered = [...filtered, ...this.include];
      
      this.texts = filtered;
    } catch (error) {
      console.error('Error loading texts from JSON:', error);
      this.texts = [];
    }
  }

  /**
   * Get a random text from the collection
   */
  getRandomText() {
    if (this.texts.length === 0) {
      throw new Error('No texts available. Did you call loadTextsFromJSON()?');
    }
    const randomIndex = Math.floor(Math.random() * this.texts.length);
    return this.texts[randomIndex];
  }

  /**
   * Load a random text into the corpus
   */
  async loadRandomText() {
    const text = this.getRandomText();
    await this.setTextFromFile(text.filename);
    this.source = text.title;
    return text;
  }

  /**
   * Load a specific text by index
   */
  async loadTextByIndex(index) {
    if (index < 0 || index >= this.texts.length) {
      throw new Error(`Invalid text index: ${index}`);
    }
    const text = this.texts[index];
    await this.setTextFromFile(text.filename);
    this.source = text.title;
    return text;
  }

  /**
   * Load a specific text by ID
   */
  async loadText(idOrTitle) {
    const text = this.texts.find(ex => ex.id === idOrTitle || ex.title === idOrTitle);
    if (!text) {
      throw new Error(`Text not found: ${idOrTitle} in ${this.texts.map(t => `${t.id}: ${t.title}`).join(', ')}`);
    }
    await this.setTextFromFile(text.filename);
    this.source = text.title;
    return text;
  }

  /**
   * Set custom user-provided text
   */
  setCustomText(text, title = 'Custom Text') {
    this.setText(text);
    this.source = title;
  }

  /**
   * Get list of all available texts
   * @returns {Array} List of texts with index, id, title, filename, tags, author, url
   */
  getTextList() {
    return this.texts.map((text, index) => ({
      index,
      id: text.id,
      title: text.title,
      filename: text.filename,
      tags: text.tags || [],
      author: text.author || '',
      url: text.url || '',
    }));
  }
}
