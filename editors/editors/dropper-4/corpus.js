const POS_ORDER_CLASSIC = [
  'verb', 'noun', 'adjective', 'random', 'linear', 'linear'
];

const POS_ORDER = [
  'linear', 'linear', 'verb', 'verb', 'verb', 'noun', 'noun', 'noun', 'adjective', 'adjective', 'adjective', 'random', 'random', 'random'
];

// https://thereadersproject.org/readers.html
let MODES = ['pos', 'pos-classic', 'focused', 'gramatical'];
// mesostic reader

// gramatical lookahead readern


// Perigram Reader
// Having read a word, the Perigram Reader decides what to read next by paying particular attention to this last word’s 'easterly' neighbors, those to its right, but not only the next word in a normal reading order—words immediately above or below are also of interest to this reader. If it finds that either the word above or below would form a Perigram, a short sequence of statistically probable natural language, it may diverge, if only slightly, from a normal human reading path. This reader has, nonetheless, been given a weighted tendency to move steadily through a text as most human readers would.

// The Unconstrained Perigram Reader is a variety of the Perigram Reader that is less constrained than its cousin. Having read a word, this reader also looks around at its a typographic neighbors. Whereas the Perigram Reader is only interested in its 'easterly' neighbors, this reader will consider whether any adjacent word, even the preceding word, would form a perigram. If it finds such a phrase, the reader may read in the direction of the viable word. This reader wanders and may be momentarily caught in eddies and loops. It is also, however, weighted to proceed slowly through the text. Visually, it 'haloes' the words at the center of its attention.

// The Mesostic Reader has a short fragment of written language—a word, phrase, or longer piece of text—that it wants to spell out. It moves through a text looking for words that contain the letters, one-by-one, of the (typically) shorter text that it spells. When it finds a word that contains a required letter, the reader capitalizes the letter in place. The reader’s choice of word is further constrained by an engineered tendency—shared with other readers—to compose perigrams.

// The Grammatical Lookahead Reader does 'look ahead' as it reads, but it has also 'looked ahead' in the sense that it has learned something of the grammatical patterning of the text it has read thus far. With this acquired information in store it jumps forwards to words that fit equally well within the grammatical structure of the passage it is reading. By also considering the syntagmatic context, it brings words back into phrases that might well have contained them and anticipates readings normally still to come, leaving strange lacuna in the text while still preserving aspects of its style.

class Corpus {
    constructor(mode='pos') {
      this.nouns = [];
      this.verbs = []; 
      this.adjectives = []; 

      this.selectionStrategy(mode);

      this.doc = null;
      this.texts = [];
      this.words = [];

      this.posIndex = 0;
      this.linearIndex = 0;
      this.randomIndex = 0;
      this.verbIndex = 0;
      this.nounIndex = 0;
      this.adjectiveIndex = 0;

      this.wordPOSOrder = POS_ORDER;
    }
  
    selectionStrategy(mode) {
      if (!MODES.includes(mode)) {
        throw new Error("Invalid mode", mode);
      }
      this.mode = mode;
    }

    async setCorpusFromFile(filename) {
      const assetsFolder = '/editors/assets';
      try {
        const filePath = `${assetsFolder}/${filename}`;
        console.log('Loading corpus from:', filePath);
        const response = await fetch(filePath);
        let text = await response.text();
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
      
      this.doc = nlp(combinedText);
      // Store all words with their POS info
      this.words = this.doc.terms().json().map((jsonTerm) => {
        if (jsonTerm.terms.length != 1) {
          console.error("Term length should be 1", jsonTerm);
        }
        let term = jsonTerm.terms[0];
        return {
          text: term.text,
          pos: term.tags[0] || 'Unknown',  // Get the primary tag
          term: term
        }
      });

      
      // Create POS-specific arrays of the same word objects
      this.verbs = this.words.filter(w => w.pos === 'Verb');
      this.nouns = this.words.filter(w => w.pos === 'Noun');
      this.adjectives = this.words.filter(w => w.pos === 'Adjective');
      
      // Create randomized order of the same word objects
      this.randomOrder = [...this.words].sort(() => Math.random() - 0.5);
      
      this.linearIndex = 0;
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
      if (this.mode === 'pos-classic') {
        this.wordPOSOrder = POS_ORDER_CLASSIC;
        wordObject = this.getNextWordPOS();
      } else if (this.mode === 'pos') {
        this.wordPOSOrder = POS_ORDER;
        wordObject = this.getNextWordPOS();
      } else if (this.mode === 'focused') {
        wordObject = { ...this.getNextWordFocused(), type: 'linear' };
      } else if (this.mode === 'gramatical') {
        wordObject = this.getNextWordGramatical();
      } else {
        console.error("Invalid mode", this.mode);
      }

      if (wordObject.text) {
        wordObject.text = wordObject.text.replace(/[!"#$%&'()*+,./:;<=>?@[\]^`{|}~]/g, '');
      }

      return wordObject;
    }

    getNextConstraint() {
      let constraints = [
        'pos',
      ]

      let subConstraints = {
        'pos': [
          'noun',
          'adjective',
          'verb',
          'preposition',
          'adverb',
          'conjunction',
          'interjection'],
      }
      //randomly select
      let constraint = constraints[Math.floor(Math.random() * constraints.length)];
      let constraintVal = subConstraints[constraint][Math.floor(Math.random() * subConstraints[constraint].length)];

      return {
        text: '_', 
        type: 'constraint', 
        constraint: {
          type: constraint,
          value: constraintVal,
        }
      }
    } // TODO use this for something

    getNextWordFocused() {
      if (this.words.length === 0) {
        return null;
      }
      const wordObj = this.words[this.linearIndex++ % this.words.length];
      return { ...wordObj, type: 'linear' };
    }


    getGramaticalBase() {
      if (this.gramaticalBase) {
          return this.gramaticalBase;
      }

      // use compromise doc to get the first sentence's POS syntagm
      this.gramaticalBase = this.doc.sentences().json()[0].terms.map(term => term.tags[0]);
      return this.gramaticalBase;
    }

    getNextWordGramatical() {
      
    }

    getNextWordPOS() {
        // return ith verb followed by jth noun followed by kth adj etc
        let type = this.wordPOSOrder[this.posIndex++ % this.wordPOSOrder.length];
        let wordObj;

        type = type ? type.toLowerCase() : type;

        if (type === 'verb') {
            wordObj = this.verbs[this.verbIndex++ % this.verbs.length];
        } else if (type === 'noun') {
            wordObj = this.nouns[this.nounIndex++ % this.nouns.length];
        } else if (type === 'adjective') {
            wordObj = this.adjectives[this.adjectiveIndex++ % this.adjectives.length];
        } else if (type === 'linear') {
            wordObj = this.words[this.linearIndex++ % this.words.length];
        } else if (type === 'random') {
            wordObj = this.getNextRandomOrder();
        } else {
            console.error("Invalid type", type);
            return { text: null, type: 'random', pos: 'unknown' };
        }

        return { ...wordObj, type };
    }

    getNextRandomOrder() {
        return this.randomOrder[this.randomIndex++ % this.randomOrder.length];
    }
  }