import { Reader } from './Reader.js';
import { TextCorpus } from '../corpus/TextCorpus.js';

/**
 * Implementation of Reader for text-based corpora.
 * Reads from a TextCorpus instance and tracks reading position.
 * 
 */
export class TextReader extends Reader {
    /**
     * Creates a new TextReader instance.
     * @param {TextCorpus} corpus - The text corpus to read from.
     * @throws {Error} If corpus is not an instance of TextCorpus.
     */
    constructor(corpus) {
        super();
        if (!(corpus instanceof TextCorpus)) {
            throw new Error("corpus must be an instance of TextCorpus");
        }
        this.corpus = corpus;
        this.state = {
            index: 0,
        }
    }

    /**
     * Updates the reader's internal state.
     * Increments the current index position.
     */
    updateState() {
        this.state.index = this.state.index + 1;
        if (this.state.index >= this.corpus.tokens.length) {
            this.state.index = 0;
        }
    }

    currentToken() {
        let token = this.corpus.getToken(this.state.index);
        return token;
    }

    /**
     * Creates a clone of this TextReader with independent state and cloned corpus.
     * The clone has its own corpus with unique token IDs and its own reading position.
     * @returns {TextReader} A new TextReader instance with independent state and corpus.
     */
    clone() {
        return new TextReader(this.corpus.clone());
    }
}
