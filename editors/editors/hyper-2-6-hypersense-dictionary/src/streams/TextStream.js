import eventBus from '../EventBus.js';
import { uuid } from '../corpus/Token.js';

/**
 * TextStream represents the data for a stream of tokens/words.
 * 
 * This class manages the actual token data - storing them, retrieving them, and keeping
 * the stream filled using a Reader. It's the data layer, with no visual logic.
 * 
 * ## Communication:
 * 
 * TextStream communicates changes by emitting events through the EventBus:
 * - `token-change` - when a token is modified
 * - `stream-push` - when a new token is added
 * - `stream-pop` - when a token is removed
 * 
 * TextStreamComponent listens for these events and updates the visual display accordingly.
 * TextStreamEntity coordinates between the two.
 */
export class TextStream {
  /**
   * Creates a new TextStream
   * @param {number} size - The number of tokens to maintain in the stream
   * @param {Reader} reader - The reader to use for generating tokens
   */
  constructor(size = 20, reader) {
    this.id = uuid('stream-');
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

  print() {
    console.log('TextStream.print():', this.tokens.map(token => token.text));
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
   * Resize the stream to a new size, truncating or filling as needed.
   * @param {number} newSize - The new size
   */
  resize(newSize) {
    this.size = newSize;
    while (this.tokens.length > this.size) {
      const token = this.tokens.shift();
      this.emitPop(token);
    }
    this.fillStream();
  }

  /**
   * Expand the stream to at least newSize, filling if needed but never truncating.
   * @param {number} newSize - The minimum size
   */
  expand(newSize) {
    this.size = newSize;
    this.fillStream();
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
