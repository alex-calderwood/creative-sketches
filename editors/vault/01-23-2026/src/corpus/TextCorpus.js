import { Token } from './Token.js';

export class TextCorpus {
      constructor( source='unknown') {
        this.source = source;
        this.doc = null;
        this.tokens = [];
        this.text = "";
      }

      /**
       * Override the square brackets to get an ith token
       **/
      getToken(i) {
        let token = this.tokens[i];
        return Token.fromToken(token);
      }

      async setTextFromFile(filename) {
        this.source = filename;
        const assetsFolder = '/editors/assets';
        try {
          const filePath = `${assetsFolder}/${filename}`;
          console.log('TextCorpus Loading corpus from:', filePath);
          const response = await fetch(filePath);
          let text = await response.text();
          this.setText(text);
        } catch (error) {
          console.error('Error loading corpus:', filename, error);
        }
      }
  
      setText(text) {
        this.text = text;
        
        // Use comprimise to tokenize the text
        this.doc = nlp(text);

        // Store all tokens with their POS info
        this.tokens = this.doc.terms().map((parentTerm) => {
          return parentTerm.terms().map((subTerm, idx) => {
            let token = subTerm.json();
            if (token.length != 1) {
              console.error("Token of term length should be 1", token);
            }
            token = token[0].terms[0];
            return new Token({
              // ...token,
              text: token.text,
              pos: token.tags[0] || 'Unknown',  // Get the primary tag
              parentTerm: parentTerm,           // parent term reference
              term: subTerm,                    // term reference
              termIndex: idx,
              source: this.source,
            });
          });
        }).flat().filter(token => token.text && token.text.trim().length > 0); // Filter out empty tokens
      }

    head(N=100) {
        let head = this.tokens.slice(0, N);
        return head;
    }

    /**
     * Creates a clone of this corpus with new token IDs.
     * The clone shares the same text and doc but has tokens with unique IDs.
     * @returns {TextCorpus} A new TextCorpus instance with cloned tokens.
     */
    clone() {
        const clonedCorpus = new TextCorpus(this.source);
        clonedCorpus.text = this.text;
        clonedCorpus.doc = this.doc;
        
        // Clone all tokens with new IDs
        clonedCorpus.tokens = this.tokens.map(token => Token.fromToken(token));
        
        return clonedCorpus;
    }
}
