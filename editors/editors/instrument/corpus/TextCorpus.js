class TextCorpus {
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
        return this.tokens[i];
      }

      async setTextFromFile(filename) {
        this.source = filename;
        const assetsFolder = '/editors/assets';
        try {
          const filePath = `${assetsFolder}/${filename}`;
          console.log('Loading corpus from:', filePath);
          const response = await fetch(filePath);
          let text = await response.text();
          this.setTextFromString(text);
        } catch (error) {
          console.error('Error loading corpus:', filename, error);
        }
      }
  
      setText(text) {
        this.text = text;
        
        // Use comprimise to tokenize the text
        this.doc = nlp(text);

        // Store all tokens with their POS info
        this.tokens = this.doc.terms().json().map((jsonTerm) => {
          if (jsonTerm.terms.length != 1) {
            console.error("Term length should be 1", jsonTerm);
          }
          let term = jsonTerm.terms[0];
          return new Token({
            text: term.text,
            pos: term.tags[0] || 'Unknown',  // Get the primary tag
            term: term,
            source: this.source,
          });
        });
      }

    head(N=100) {
        let head = this.tokens.slice(0, N);
        console.log("TextCorpus.head():", head);
        return head;
    }
}

