const POS_TAGS = [
  'conjunction',
  'cardinal',
  'determiner',
  'preposition',
  'expression',
  'adjective',
  'comparative',
  'superlative',
  'modal',
  'noun',
  'plural',
  'singular',
  'possessive',
  'pronoun',
  'adverb',
  'phrasalverb',
  'verb',
  'pasttense',
  'gerund',
  'participle',
  'presenttense'
];

const POS_TAGS_FOR_CONSTRAINTS = [
  'noun',
  'verb',
  'determiner',
  'preposition',
  'conjunction',
  'verb',
  'adjective',
  'word',
  'adverb',
  'noun',
  'propernoun',
  'conjunction',
  'pronoun',
  'word',
]

const CLASSIC_POS_ORDER = [
  'linear', 'linear', 'verb', 'verb', 'noun', 'noun', 'adjective', 'verb', 'adverb', 'determiner', 'preposition', 'interjection', 'conjunction', 'propernoun', 'value', 'random', 'random', 'random'
];

// https://thereadersproject.org/readers.html
let MODES = ['pos', 'focused', 'gramatical', 'letters'];
// mesostic reader

// gramatical lookahead readern


// Perigram Reader
// Having read a token, the Perigram Reader decides what to read next by paying particular attention to this last token’s 'easterly' neighbors, those to its right, but not only the next token in a normal reading order—tokens immediately above or below are also of interest to this reader. If it finds that either the token above or below would form a Perigram, a short sequence of statistically probable natural language, it may diverge, if only slightly, from a normal human reading path. This reader has, nonetheless, been given a weighted tendency to move steadily through a text as most human readers would.

// The Unconstrained Perigram Reader is a variety of the Perigram Reader that is less constrained than its cousin. Having read a token, this reader also looks around at its a typographic neighbors. Whereas the Perigram Reader is only interested in its 'easterly' neighbors, this reader will consider whether any adjacent token, even the preceding token, would form a perigram. If it finds such a phrase, the reader may read in the direction of the viable token. This reader wanders and may be momentarily caught in eddies and loops. It is also, however, weighted to proceed slowly through the text. Visually, it 'haloes' the tokens at the center of its attention.

// The Mesostic Reader has a short fragment of written language—a token, phrase, or longer piece of text—that it wants to spell out. It moves through a text looking for tokens that contain the letters, one-by-one, of the (typically) shorter text that it spells. When it finds a token that contains a required letter, the reader capitalizes the letter in place. The reader’s choice of token is further constrained by an engineered tendency—shared with other readers—to compose perigrams.

// The Grammatical Lookahead Reader does 'look ahead' as it reads, but it has also 'looked ahead' in the sense that it has learned something of the grammatical patterning of the text it has read thus far. With this acquired information in store it jumps forwards to tokens that fit equally well within the grammatical structure of the passage it is reading. By also considering the syntagmatic context, it brings tokens back into phrases that might well have contained them and anticipates readings normally still to come, leaving strange lacuna in the text while still preserving aspects of its style.

export class Corpus {
  static DEFAULT_POS_ORDER = CLASSIC_POS_ORDER;
  
    constructor(mode='focused', source='unknown') {
      this.source = source;
      this.selectionStrategy(mode);

      this.posLookup = {
        'linear': [],
        'random': [],
      };
      this.indexLookup = {
        'linear': 0,
        'random': 0,
      };
      this.posIndex = 0;


      this.doc = null;
      this.texts = [];
      this.tokens = [];
    }
  
    selectionStrategy(mode, options={}) {
      if (!MODES.includes(mode)) {
        throw new Error("Invalid mode", mode);
      }
      this.mode = mode;

      this.tokenPOSOrder = options.tokenPOSOrder || Corpus.DEFAULT_POS_ORDER;
    }

    async setCorpusFromFile(filename) {
      this.source = filename;
      const assetsFolder = window.BASE_PATH + '/assets';
      try {
        const filePath = `${assetsFolder}/${filename}`;
        console.log('Loading corpus from:', filePath);
        const response = await fetch(filePath);
        let text = await response.text();
        this.setTextFromString(text);
      } catch (error) {
        console.error('Error loading corpus:', filename, error);
        this.texts = [];
        this.tokens = [];
      }
    }

    setTextFromString(text) {
      this.texts = [text]; // Replace all texts with this single text
      this.updateFromTexts();
    }

    addText(text) {
      this.texts.push(text);
      this.updateFromTexts();
    }

    updateFromTexts() {
      // Combine all texts into one string for processing
      const combinedText = this.texts.join(' ');
      
      this.doc = nlp(combinedText);
      // Store all tokens with their POS info
      this.tokens = this.doc.terms().json().map((jsonTerm) => {
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

      this.letters = this.tokens.flatMap((token) => {
        let text = token.text + '_';
        return text.split('').map((letter) => {return {text: letter, type: 'letter'}});
      })

      // Reset the counters
      this.posLookup = { };
      this.indexLookup = {
        'linear': 0,
        'random': 0,
        'letters': 0,
      };
      this.posIndex = 0;

      for (let token of this.tokens) {
        let pos = token.pos.toLowerCase();
        if (!this.posLookup[pos]) {
          this.posLookup[pos] = [];
          this.indexLookup[pos] = 0;
        }
        this.posLookup[pos].push(token);
        this.indexLookup[pos] = 0;
      }

      this.posLookup['linear'] = this.tokens;
      // Create randomized order of the same token objects
      this.posLookup['random'] = [...this.tokens].sort(() => Math.random() - 0.5);

      console.log("posLookup", this.posLookup);
    }

    appendToCorpus(text) {
      this.addText(text);
    }

    printCorpus() {
      console.log("tokens", this.tokens);
      console.log("posLookup", this.posLookup);
    }
  
    getNextToken() {
      console.log("next token", this.mode)
      let tokenObject = {};
      if (this.mode === 'pos') {
        tokenObject = this.getNextTokenPOS();
      } else if (this.mode === 'focused') {
        tokenObject = { ...this.getNextTokenFocused(), type: 'linear' };
      } else if (this.mode === 'gramatical') {
        tokenObject = this.getNextTokenGramatical();
      } else if (this.mode === 'letters') {
        tokenObject = this.getNextTokenLetter();
      }      
      else {
        console.error("Invalid mode", this.mode);
      }

      if (tokenObject.text) {
        tokenObject.text = tokenObject.text.replace(/[!"#$%&'()*+,./:;<=>?@[\]^`{|}~]/g, '');
      }

      tokenObject.source = this.source;

      return tokenObject;
    }

    // https://observablehq.com/@spencermountain/compromise-tags
    getNextConstraint() {
      let constraints = [
        'pos',
      ]

      let subConstraints = {
        'pos': POS_TAGS_FOR_CONSTRAINTS
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

    getNextTokenFocused() {
      if (this.posLookup['linear'].length === 0) {
        console.error("Focused mode has no tokens");
        return null;
      }
      if (this.indexLookup['linear'] == null) {
        console.error("Focused mode has no linear index");
        return null;
      }
      
      const tokenObj = this.posLookup['linear'][this.indexLookup['linear']++ % this.posLookup['linear'].length];

      return { ...tokenObj, type: 'linear' };
    }


    getGramaticalBase() {
      if (this.gramaticalBase) {
          return this.gramaticalBase;
      }

      // use compromise doc to get the first sentence's POS syntagm
      this.gramaticalBase = this.doc.sentences().json()[0].terms.map(term => term.tags[0]);
      return this.gramaticalBase;
    }

    getNextTokenLetter() {
      let index = this.indexLookup['letters']++ % this.letters.length
      if (index == null) {
        console.error("Letters mode has no letters index");
        return null;
      }
      let letter = this.letters[index] || null;
      if (letter == null) {
        console.error("Letter mode has no letters");
        return null;
      }

      return letter;
    }

    getNextTokenGramatical() {
      
    }

    getNextTokenPOS() {
        // return ith verb followed by jth noun followed by kth adj etc
        let index = this.indexLookup[this.colorBy]
        let type = this.tokenPOSOrder[this.posIndex++ % this.tokenPOSOrder.length];
        let tokenObj;

        type = type ? type.toLowerCase() : type;

        if (this.posLookup[type] == null) {
          let validTypes = Object.keys(this.posLookup);
          console.error('Invalid Type:', type);
          console.log('order', this.tokenPOSOrder);
          console.log("validTypes", validTypes);
          type = 'random';
        }
        if (this.indexLookup[type] == null) {
          throw new Error("Invalid index", type);
        }
        tokenObj = this.posLookup[type][this.indexLookup[type]++ % this.posLookup[type].length];

        return { ...tokenObj, type };
    }

    getNextRandomOrder() {
        return this.randomOrder[this.randomIndex++ % this.randomOrder.length];
    }
  }