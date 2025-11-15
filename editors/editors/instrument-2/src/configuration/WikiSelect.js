import { ReaderSelect } from './ReaderSelect.js';
import { WikiCorpus } from '../corpus/WikiCorpus.js';
import { TextReader } from '../readers/TextReader.js';
import { createModal } from './uiUtils.js';

export class WikiSelect extends ReaderSelect {

  /**
   * Shows the reader select screen.
   * Brings up an HTML screen that allows user to select a reader. 
   * When implemented, selecting a reader should trigger
   * onReaderSelected(). which will return a Reader and emit an event.
   * @returns {void}
   * @throws {Error} If not implemented by subclass.
   */
  showReaderSelect() {
    console.log("WikiReaderSelect.showReaderSelect()");
    // Show an HTML modal 
    const modal = createModal(`
      <div class="modal-content">
        <div class="modal-header">
          <h3>Corpus Selection</h3>
        </div>
        <div class="modal-body">
          <input type="text" id="wikipedia-url" placeholder="Enter a Wikipedia URL">
        </div>
        <div class="modal-footer">
          <button id="cancel" class="control-btn">Cancel</button>
          <button id="select" class="control-btn">Select</button>
        </div>
      </div>
    `);
    
    // Add event listeners
    document.getElementById('select').addEventListener('click', () => {
      this.onReaderSelected();
      modal.remove();
    });
    
    document.getElementById('cancel').addEventListener('click', () => {
      modal.remove();
    });
    
    return modal;
  }
  
  /**
   * Creates a reader from the selected Wikipedia URL
   * @param {string} [providedUrl] - Optional URL provided externally
   * @returns {Reader} The reader that was selected
   */
  onReaderSelected(providedUrl) {
    const url = providedUrl || document.getElementById('wikipedia-url').value;
    const corpus = new WikiCorpus(url);
    corpus.fromWikipedia(url).then(() => {
      const reader = new TextReader(corpus);
      super.onReaderSelected(reader);
      return reader;
    });
  }

  
}
