/**
 * Abstract base class for corpus readers.
 * Defines the interface that all reader implementations must follow.
 * 
 * To implement a Reader, you sohuld impleent currentToken and updateState but NOT read
 */
export class Reader {
    /**
     * Creates a new Reader instance.
     */
    constructor() {

    }

    /**
     * Returns the next token from the stream and then updates the state.
     * @returns {Object} A token JSON object representing the corpus token.
     * @throws {Error} If not implemented by subclass.
     */
    read() {
        let token = this.currentToken();
        this.updateState();
        return token;
    }

    currentToken() {
        throw new NotImplementedError("currentToken() not implemented");
    }

    /**
     * Updates the reader's internal state.
     * @param {Object} newState - New state to apply to the reader.
     * @throws {Error} If not implemented by subclass.
     */
    updateState() {
        throw new Error("updateContext() not implemented");
    }

    toString() {
        return `Reader(type: ${this.constructor.name})`;
    }
}