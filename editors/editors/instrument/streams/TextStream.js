/**
 * TextStream - Base class for text token streams
 * Manages a stream of tokens that can be accessed and modified
 */
class TextStream {
  /**
   * Creates a new TextStream
   * @param {number} size - The number of tokens to maintain in the stream
   * @param {Reader} reader - The reader to use for generating tokens
   */
  constructor(size = 20, reader) {
    this.size = size;
    this.tokens = [];
    this.reader = reader;
    this.fillStream();
  }

  /**
   * Pops the first token from the stream and fills it back up.
   * Filling the stream should emit an event for each token.
   * TODO should this actually emit an event rather than return the token?
   * @returns {Object} The token that was popped
   * @throws {Error} If no tokens to pop
   */
  pop() {
    if (this.tokens.length === 0) {
      console.error("TextStream.pop(): No tokens to pop");
      return null;
    }
    let token = this.tokens.shift();
    this.emitPop(token);

    this.fillStream(); // TODO should this be async?
    return token;
  }

  /**
   * Returns the current token stream
   * @returns {Array} Array of token objects
   */
  getStream() {
    return this.tokens;
  }

  /**
   * Fills the stream with {this.size} tokens from the reader
   * Emits an event for each update
   */
  fillStream() {
    while (this.tokens.length < this.size) {
      let token = this.reader.read();
      this.tokens.push(token);
      this.emitPush(token);
    }
  }

  /**
   * @param {number} index - The index of the token to retrieve
   * @returns {Object} The token at the specified index
   */
  getToken(index) {
    if (index < 0 || index >= this.size) {
      throw new Error(`Index out of bounds: ${index}`);
    }
    return this.tokens[index];
  }

  /**
   * Sets a token at the specified index
   * @param {number} index - The index where to set the token
   * @param {Object} token - The token to set
   */
  setToken(index, token) {
    if (index < 0 || index >= this.size) {
      throw new Error(`Index out of bounds: ${index}`);
    }
    this.tokens[index] = token;
    this.emitChange(index);
  }

  /**
   * Updates the reader used by this stream
   * @param {Reader} reader - The new reader to use
   */
  updateReader(reader) {
    this.reader = reader;
    this.fillStream();
  }
  
  /**
   * Emits an event indicating that a token has changed
   * @param {number} index - The index of the token that changed
   */
  emitChange(index) {
    eventBus.emit('token-change', {
      index: index,
      token: this.tokens[index],
      stream: this
    });
  }

  /**
   * Emits an event indicating that the stream has shifted
   */
  emitPush(token) {
    eventBus.emit('stream-push', {
      token: token,
      stream: this
    });
  }

  emitPop(token) {
    eventBus.emit('stream-pop', {
      token: token,
      stream: this
    });
  }
}
