import { Token } from '../corpus/Token.js';
import { getSynonyms } from '../words/synonyms.js';

/**
 * A reader that maintains a full text and returns it with each word
 * replaced by synonyms.
 * Caches synonym lookups for performance.
 * 
 * - getSynonymizedText(index) returns the full text with each word replaced by its nth synonym
 * - read() returns only the first synonym of the last new word
 */
export class SynonymSentenceReader {
    constructor(text = '', params = {}) {
        this.text = text;
        this.params = {
            ...params,
        };
        // Cache: word -> array of valid synonyms (including original as fallback)
        this.synonymCache = new Map();
        // Track pending lookups to avoid duplicate fetches
        this.pendingLookups = new Map();
        // Track the previous words to detect new words
        this.previousWords = [];
        // The last new word that was added
        this.lastNewWord = null;
    }

    /**
     * Update the full text that this reader maintains.
     * This will trigger synonym lookups for any new words.
     */
    async updateText(text) {
        this.text = text;
        // Extract current words
        const currentWords = this._extractWords(text);
        
        // Find new words by comparing with previous words
        // A word is "new" if it appears at a position beyond the previous word list
        // or if the word at that position changed
        this.lastNewWord = null;
        
        if (currentWords.length > this.previousWords.length) {
            // New word(s) added at the end
            this.lastNewWord = currentWords[currentWords.length - 1];
        } else if (currentWords.length > 0) {
            // Check if the last word changed (user is still typing it)
            const lastIdx = currentWords.length - 1;
            if (this.previousWords[lastIdx] !== currentWords[lastIdx]) {
                this.lastNewWord = currentWords[lastIdx];
            }
        }
        
        // Update previous words for next comparison
        this.previousWords = [...currentWords];
        
        // Pre-fetch synonyms for all words in the text
        await Promise.all(currentWords.map(word => this._lookupSynonym(word)));
    }

    /**
     * Extract words from text, preserving their original form for lookup.
     */
    _extractWords(text) {
        return text.match(/\b\w+\b/g) || [];
    }

    /**
     * Get word from the cache or retrieve it from the synonym server
     */
    async _lookupSynonym(word) {
        
        // Already cached
        if (this.synonymCache.has(word)) {
            return;
        }
        
        // Already fetching
        if (this.pendingLookups.has(word)) {
            return this.pendingLookups.get(word);
        }
        
        // Start new lookup
        const lookupPromise = this._fetchAndCacheSynonym(word);
        this.pendingLookups.set(word, lookupPromise);
        
        try {
            await lookupPromise;
        } finally {
            this.pendingLookups.delete(word);
        }
    }

    async _fetchAndCacheSynonym(originalWord) {
        const data = await getSynonyms(originalWord);
        
        // Get all synonyms that pass criteria
        const validSynonyms = data.synonyms.filter(syn => this._synonymCriteria(originalWord, syn));
        
        // Store array of valid synonyms (with original word as fallback at the end)
        // This allows getSynonymizedText(n) to pick the nth synonym
        this.synonymCache.set(originalWord, validSynonyms.length > 0 ? validSynonyms : [originalWord]);
    }

    _synonymCriteria(originalWord, synonym) {
        // const nearLength = Math.abs(originalWord.length - synonym.length) < originalWord.length / 2;
        const notJustDifferentCase = originalWord.localeCompare(synonym, undefined, { sensitivity: 'accent' }) !== 0;
        return notJustDifferentCase;
    }

    /**
     * Get the nth synonym for a word from cache.
     * If index exceeds available synonyms, wraps around.
     * Returns the original word if not cached yet.
     * @param {string} word - The word to get synonym for
     * @param {number} index - Which synonym to get (0 = first, 1 = second, etc.)
     */
    _getSynonymFromCache(word, index = 0) {
        const synonyms = this.synonymCache.get(word);
        
        if (!synonyms || synonyms.length === 0) {
            return word;
        }
        
        // Wrap around if index exceeds available synonyms
        const wrappedIndex = index % synonyms.length;
        return synonyms[wrappedIndex];
    }

    /**
     * Returns the full text with each word replaced by its nth synonym.
     * @param {number} index - Which synonym to use (0 = first, 1 = second, etc.)
     */
    getSynonymizedText(index = 0) {
        // Replace each word with its nth synonym, preserving punctuation and whitespace
        const synonymizedText = this.text.replace(/\b(\w+)\b/g, (match) => {
            return this._getSynonymFromCache(match, index);
        });
        
        return synonymizedText;
    }

    /**
     * Returns only the first synonym of the last new word.
     * Returns null if there is no new word.
     */
    read() {
        if (!this.lastNewWord) {
            return null;
        }
        
        const synonym = this._getSynonymFromCache(this.lastNewWord, 0);
        return new Token({ text: synonym, type: 'word' });
    }

    clone() {
        const cloned = new SynonymSentenceReader(this.text, this.params);
        // Share the cache for efficiency
        cloned.synonymCache = this.synonymCache;
        return cloned;
    }
}

