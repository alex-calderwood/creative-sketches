let bert_url = 'http://localhost:5000';
const bertContextLength = 100;

const llamaTokens = 6;

function parseText(text) {
    let doc = nlp(text);
    let sentences = doc.json();
    let words = sentences.map(sentence => sentence.terms.map(term => term.text)).flat()
    return words;
}

function taggedText(text, tag) {
    let doc = nlp(text);
    let match = doc.match(tag).out('array');
    return match;
}

function callBERT(leftwords, rightwords, badwords) {
    try {
        return fetch(base_url + '/bert', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                leftwords: leftwords,
                rightwords: rightwords,
                badwords: badwords,
            }),
            mode: 'cors'
        }).then(response => {
            return response.json()
        })
        .then(word => {
            if (word == null) {
                return null;
            }
            word = word.toUpperCase();
            word = word.replace(/[.,'"\/#$%\^&\*;:{}=\-_`~()]/g, '');
            console.log("Calling BERT", 'left', leftwords, 'right', rightwords, 'result', word);
            return word;
        })
    } catch (error) {
        return null;
    }
}

function noteSlider() {}

class Worder {
    constructor() {
        this.words = {}; // {id: {word: "word", x: 0, y: 0, size: 0, wordWidth: 0}}
        this.wordOrder = []; // [id, id, id]
        this._nextWordID = 0;
        this.guitarNoteRange = [40, 89];
    }

    noteToWords(note) {
        let words = this._noteToWordsProtocol(note)
        return words.map(this.formatWord.bind(this))
    }

    _preprocessNote(note) {
        // create a copy of the note
        let newNote = Object.assign({}, note)

        if (newNote.source == "keyboard") {
            return newNote;
        }
        newNote.note = newNote.note - this.guitarNoteRange[0];  
        return newNote;
    }
    
    /* 
    * This function is for the Worder mixin to implement. It should take a note and return a word.
    */
    _noteToWordsProtocol(note) {
        note = this._preprocessNote(note);
        return [note.note.ToString()];
    }

    addWordToContext(word) {
        word = Object.assign({}, word);
        console.log("adding word", word);
        this.words[word.id] = word;
        if (word.after) {
            let index = this.wordOrder.indexOf(word.after);
            if (index === -1) {
                this.wordOrder.unshift(word.id);
            } else {
                this.wordOrder.splice(index + 1, 0, word.id);
            }
            delete word.after;
        } else {
            this.wordOrder.push(word.id);
        }
    }

    updateWord(id, word) {
        word.id = id;
        this.words[id] = word;
    }

    updateContext(newContext) {
        this.words = {}
        this.wordOrder = [];

        let tokenized;
        if (typeof newContext === 'string') {
            tokenized = parseText(newContext);
        } else {
            tokenized = newContext;
        }
        
        for(let word of tokenized) {
            this.addWordToContext(this.formatWord(word));
        }
    }

    getContextData() {
        return this.wordOrder.map(id => this.words[id]);
    }
 
    getContext() {
        return this.wordOrder.map(id => this.words[id].word);
    }

    formatWord(word) {
        return {
            id: this.nextID(),
            word: word,
        }
    }

    nextID() {
        return this._nextWordID++;
    }

    curLineLength() {
        let words = this.getContextData();
        let lastLineLength = words.length;
        for (let i = words.length - 1; i >= 0; i--) {
            let word = words[i];
            if (word.word == '\n') {
                lastLineLength = words.length - i;
                break;
            }
        }
        return lastLineLength;
    }

    reset() {
        this.words = {};
        this.wordOrder = [];
        this._nextWordID = 0;
    }

    deleteWord(id) {
        let index = this.wordOrder.indexOf(id);
        if (index !== -1) {
            this.wordOrder.splice(index, 1);
        }
        delete this.words[id];
    }
}

let indexWorderMixin = {
    setCorpus(corpus) {
        this.corpus = parseText(corpus);
    },

    noteToWordsByIndex(note) {
        note = this._preprocessNote(note);
        this.lastWord = this.corpus[note % this.corpus.length];
        return [this.lastWord];
    },

    _noteToWordsProtocol(note) {
        return this.noteToWordsByIndex(note);
    }
}


let phraseWorderMixin = {
    setCorpus(corpus) {
        this.corpus = parseText(corpus);
        let merged = [];
        for (let i = 0; i < this.corpus.length; i += 2) {
            merged.push(this.corpus[i] + " " + this.corpus[i + 1]);
        }
        this.corpus = merged;
    },

    noteToWordsByPhrase(note) {
        note = this._preprocessNote(note);
        this.lastWord = this.corpus[note.note % this.corpus.length];
        return this.lastWord.split(' ')
    },

    _noteToWordsProtocol(note) {
        return this.noteToWordsByPhrase(note);
    }
}

let bertWorderMixin = {
    noteToWordsByBert(note) {
        let leftwords = this.getContext().slice(bertContextLength * -1);
        let rightwords = [];
        let badwords = [];
        
        return callBERT(leftwords, rightwords, badwords).then(word => {
            return [word];
        });
    },

    _noteToWordsProtocol(note) {
        return this.noteToWordsByBert(note);
    }
}

let llamaWorderMixin = {
    noteToWordsByLlama(note) {
        note = this._preprocessNote(note);
        try {
            let context = this.getContext().join(' ');
        let prompt = "\"NONSENSE SPOUTS\" (An intense dadaist poem. Generated by AI, human intervention and otherworldly passion.)\n\n" + context
        return fetch('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: "llama2:7b-text",
                prompt: prompt,
                options: {
                    num_predict: llamaTokens,
                    num_ctx: 300
                }
            }),
            mode: 'cors'
        }).then(response => {
            return response.text();
        }).then(text => {
            const jsonLines = text.trim().split('\n'); // Split the text by newlines
            const jsonData = jsonLines.map(line => JSON.parse(line)); // Parse each line as JSON
            let words = jsonData.map(data => data['response'].toUpperCase())
            words = words.map(word => word.replace(/[=\n]/g, ''));
            let lastSpace = words.length;
            for (let i = 0; i < words.length; i++) {
                let word = words[i];
                if (word != '' && word[0] == ' ') {
                    lastSpace = i;
                }
            }
            words.splice(lastSpace, words.length - lastSpace);
            words = words.join('');
            const parsed = parseText(words);
            const final = parsed.filter(word => word.length > 0).map(this.formatWord.bind(this));
            return final;
          })
        } catch (error) {
            return null;
        }
        
    },

    _noteToWordsProtocol(note) {
        return this.noteToWordsByLlama(note);
    }
}