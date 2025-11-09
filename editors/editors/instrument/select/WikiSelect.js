function createModal(content) {
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = content;
  document.body.appendChild(modal);
  modal.style.display = 'flex';
  return modal;
}

class WikiSelect extends ReaderSelect {

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
          <h3>Enter a Wikipedia URL</h3>
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
