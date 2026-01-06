export class ReaderSelect {
  constructor() {
    this.resolveReaderPromise = null;
  }

  /**
   * Shows the reader select screen.
   * Brings up an HTML screen that allows user to select a reader. 
   * When implemented, selecting a reader should trigger
   * onReaderSelected(). which will return a Reader and emit an event.
   * @returns {void}
   * @throws {Error} If not implemented by subclass.
   */
  showReaderSelect() {
    throw new Error("showReaderSelect() not implemented");
  }
  
  onReaderSelected(reader) {
    if (this.resolveReaderPromise) {
      this.resolveReaderPromise(reader);
    }
  }

  /**
   * Gets a reader asynchronously after user selection
   * @returns {Promise<Reader>} A promise that resolves to the selected reader
   */
  getReader() {
    return new Promise((resolve) => {
      this.resolveReaderPromise = resolve;
      this.showReaderSelect();
    });
  }
}
