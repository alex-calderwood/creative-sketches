class Corpus {
    constructor() {
      this.nouns = [];
      this.verbs = []; 
      this.adjectives = []; 

      this.mode = 'nlp';

      this.doc = null;
      this.texts = [];
      this.words = [];

      this.posIndex = 0;
      this.linearIndex = 0;
      this.randomIndex = 0;
      this.verbIndex = 0;
      this.nounIndex = 0;
      this.adjectiveIndex = 0;
    }
  
    async setCorpusFromFile(filename) {
      const assetsFolder = window.BASE_PATH + '/assets';
      try {
        const filePath = `${assetsFolder}/${filename}`;
        console.log('Loading corpus from:', filePath);
        const response = await fetch(filePath);
        let text = await response.text();
        console.log('Corpus loaded:', text);
        this.setTextFromString(text);
      } catch (error) {
        console.error('Error loading corpus:', filename, error);
        this.texts = [];
        this.words = [];
      }
    }

    setTextFromString(text) {
      this.texts = [text]; // Replace all texts with this single text
      this.updateWordsFromTexts();
    }

    addText(text) {
      this.texts.push(text);
      this.updateWordsFromTexts();
    }

    updateWordsFromTexts() {
      // Combine all texts into one string for processing
      const combinedText = this.texts.join(' ');
      this.words = combinedText.split(/\s+/);
      this.randomOrder = this.words.concat().sort(() => Math.random() - 0.5);
      this.linearIndex = 0;
      
      this.doc = nlp(combinedText);
      this.verbs = this.doc.verbs().text().split(/\s+/);
      this.nouns = this.doc.nouns().text().split(/\s+/);
      this.adjectives = this.doc.adjectives().text().split(/\s+/);

      this.printCorpus();
    }

    appendToCorpus(text) {
      this.addText(text);
    }

    printCorpus() {
      console.log("words", this.words);
      console.log('verbs', this.verbs);
      console.log('nouns', this.nouns);
      console.log('adjectives', this.adjectives);
      console.log('randomOrder', this.randomOrder);
    }
  
    getNextWord() {
      let wordObject = {};
      if (this.mode === 'nlp') {
        wordObject = this.getNextWordPOS();
      } else {
        wordObject = { word: this.getNextWordFocused(), type: 'linear' };
      }

      if (wordObject.word) {
        wordObject.word = wordObject.word.replace(/[!"#$%&'()*+,./:;<=>?@[\]^`{|}~]/g, '');
      }

      return wordObject;
    }

    getNextWordFocused() {
      if (this.words.length === 0) {
        return null;
      }
      return this.words[this.linearIndex++ % this.words.length];
    }

    getNextWordPOS() {
        // return ith verb followed by jth noun followed by kth adj etc
        let wordPOSOrder = ['verb', 'noun', 'adjective', 'random', 'linear', 'linear'];
        let POS = wordPOSOrder[this.posIndex++ % wordPOSOrder.length];

        if (POS === 'verb') {
            return { word: this.verbs[this.verbIndex++ % this.verbs.length], type: POS};
        } else if (POS === 'noun') {
            return { word: this.nouns[this.nounIndex++ % this.nouns.length], type: POS};
        } else if (POS === 'adjective') {
            return { word: this.adjectives[this.adjectiveIndex++ % this.adjectives.length], type: POS };
        } else if (POS === 'linear') {
            return { word: this.words[this.linearIndex++ % this.words.length], type: POS };
        } else if (POS === 'random') {
            return { word: this.getNextRandomOrder(), type: POS };
        }
        console.error("Invalid POS", POS);
        return { word: null, type: 'random' };
    }

    getNextRandomOrder() {
        return this.randomOrder[this.randomIndex++ % this.randomOrder.length];
    }
  }