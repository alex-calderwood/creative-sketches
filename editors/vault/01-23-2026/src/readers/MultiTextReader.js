import { Reader } from './Reader.js';
import { TextCorpus } from '../corpus/TextCorpus.js';

/**
 * Implementation of Reader for multiple text based corpora. 
 * In its current form, it interleaves words from each corpus but I could imagine adding other modes / ways of sampling from each text
 */
export class MultiTextReader extends Reader {
    /**
     * Creates a new MultiTextReader instance.
     * @param {TextCorpus}[] corpora - The text corpus to read from.
     * @throws {Error} If corpus is not an instance of TextCorpus.
     */
    constructor(corpora) {
        super();
        if (!Array.isArray(corpora) || corpora.length === 0 || corpora.some(corpus => !(corpus instanceof TextCorpus))) {
            throw new Error("corpora must be an array of TextCorpus instances, found: " + corpora);
        }
        this.corpora = corpora;
        // track the position of each corpus
        this.state = {
            currentCorpusIndex: 0,
            indices: Object.fromEntries(corpora.map(corpus => [corpus.source, 0])),
        }
    }

    /**
     * Updates the reader's internal state.
     * Increments the current index position.
     */
    updateState() {
        this.state.currentCorpusIndex = this.state.currentCorpusIndex + 1;
        if (this.state.currentCorpusIndex >= this.corpora.length) {
            this.state.currentCorpusIndex = 0;
        }

        const currentCorpus = this.corpora[this.state.currentCorpusIndex];
        const name = currentCorpus.source;
        this.state.indices[name] = (this.state.indices[name] + 1) % currentCorpus.tokens.length;
    }

    currentToken() {
        const currentCorpus = this.corpora[this.state.currentCorpusIndex];
        const name = currentCorpus.source;
        const index = this.state.indices[name];
        let token = currentCorpus.getToken(index);
        return token;
    }

    /**
     * Creates a clone of this TextReader with independent state and cloned corpus.
     * The clone has its own corpus with unique token IDs and its own reading position.
     * @returns {TextReader} A new TextReader instance with independent state and corpus.
     */
    clone() {
        return new MultiTextReader(this.corpora.map(corpus => corpus.clone()));
    }
}
