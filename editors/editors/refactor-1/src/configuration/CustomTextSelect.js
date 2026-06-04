import { ReaderSelect } from './ReaderSelect.js';
import { CustomTextCorpus } from '../corpus/CustomTextCorpus.js';
import { TextReader } from '../readers/TextReader.js';
import { createModal } from './uiUtils.js';

export class CustomTextSelect extends ReaderSelect {

  /**
   * Returns the HTML for the Custom Text selection section
   * @returns {string} HTML string for the section
   */
  getSectionHTML() {
    const examples = CustomTextCorpus.getExampleList();
    const examplesHtml = examples.map((example, index) => `
      <div class="text-example-option" data-index="${index}" style="cursor: pointer; padding: 10px; margin: 5px 0; border: 1px solid #ddd; border-radius: 4px; background: white;">
        <strong>${example.title}</strong>
      </div>
    `).join('');
    
    return `
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 0.9em;">Example texts:</label>
        <div id="example-texts" style="max-height: 150px; overflow-y: auto;">
          ${examplesHtml}
        </div>
      </div>
      <div style="border-top: 1px solid #eee; padding-top: 10px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold; font-size: 0.9em;">Or paste your text:</label>
        <textarea id="custom-text" placeholder="Paste text here..." style="width: 100%; padding: 6px; min-height: 80px; font-family: inherit; font-size: 0.9em;" rows="4"></textarea>
        <button id="select-custom" class="control-btn" style="width: 100%; margin-top: 8px;">Use Custom Text</button>
      </div>
    `;
  }

  /**
   * Sets up event listeners for the Custom Text section
   * @param {Function} onSelect - Callback function when a selection is made
   * @param {Function} removeModal - Function to remove the modal
   */
  setupSection(onSelect, removeModal) {
    // Set up Custom Text example options
    const textOptions = document.querySelectorAll('.text-example-option');
    textOptions.forEach(option => {
      option.addEventListener('mouseenter', () => option.style.backgroundColor = '#f0f0f0');
      option.addEventListener('mouseleave', () => option.style.backgroundColor = 'white');
      option.addEventListener('click', async () => {
        const index = parseInt(option.getAttribute('data-index'));
        removeModal();
        await this.loadCustomTextExample(index, onSelect);
      });
    });
    
    // Set up Custom Text button
    document.getElementById('select-custom').addEventListener('click', async () => {
      const customText = document.getElementById('custom-text').value;
      if (!customText || customText.trim() === '') {
        alert('Please enter some custom text');
        return;
      }
      removeModal();
      await this.loadCustomText(customText, onSelect);
    });
  }

  /**
   * Loads an example text and creates a reader
   * @param {number} index - Index of the example text
   * @param {Function} onSelect - Callback to call with the reader
   */
  async loadCustomTextExample(index, onSelect) {
    const loadingModal = createModal(`
      <div class="modal-content">
        <div class="modal-header">
          <h3>Loading Text</h3>
        </div>
        <div class="modal-body" style="text-align: center; padding: 40px;">
          <div style="font-size: 1.2em; margin-bottom: 15px;">Loading text content...</div>
          <div style="font-size: 3em;">⏳</div>
        </div>
      </div>
    `);
    
    const corpus = new CustomTextCorpus();
    await corpus.loadExampleByIndex(index);
    const reader = new TextReader(corpus);
    
    loadingModal.remove();
    
    if (onSelect) {
      onSelect(reader);
    } else {
      this.onReaderSelected(reader);
    }
  }

  /**
   * Loads custom text and creates a reader
   * @param {string} text - Custom text content
   * @param {Function} onSelect - Callback to call with the reader
   */
  async loadCustomText(text, onSelect) {
    const loadingModal = createModal(`
      <div class="modal-content">
        <div class="modal-header">
          <h3>Processing Text</h3>
        </div>
        <div class="modal-body" style="text-align: center; padding: 40px;">
          <div style="font-size: 1.2em; margin-bottom: 15px;">Processing your text...</div>
          <div style="font-size: 3em;">⏳</div>
        </div>
      </div>
    `);
    
    const corpus = new CustomTextCorpus();
    const title = text.substring(0, 50).trim() + (text.length > 50 ? '...' : '');
    corpus.setCustomText(text, title);
    const reader = new TextReader(corpus);
    
    loadingModal.remove();
    
    if (onSelect) {
      onSelect(reader);
    } else {
      this.onReaderSelected(reader);
    }
  }

  /**
   * Shows the reader select screen.
   * Brings up an HTML screen that allows user to select a reader. 
   * When implemented, selecting a reader should trigger
   * onReaderSelected(). which will return a Reader and emit an event.
   * @returns {void}
   * @throws {Error} If not implemented by subclass.
   */
  async showReaderSelect() {
    console.log("CustomTextSelect.showReaderSelect()");
    
    // Show modal with example texts and custom text option
    const modal = createModal(`
      <div class="modal-content">
        <div class="modal-header">
          <h3>Choose a Text to Read</h3>
        </div>
        <div class="modal-body">
          ${this.getSectionHTML()}
        </div>
        <div class="modal-footer">
          <button id="cancel" class="control-btn">Cancel</button>
        </div>
      </div>
    `);
    
    // Set up the section with callbacks
    this.setupSection(
      (reader) => this.onReaderSelected(reader),
      () => modal.remove()
    );
    
    document.getElementById('cancel').addEventListener('click', () => {
      modal.remove();
    });
    
    return modal;
  }

  
}

