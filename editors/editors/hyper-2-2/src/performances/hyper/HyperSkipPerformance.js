import { HyperSkipTextStreamComponent } from './HyperSkipTextStreamComponent.js';
import { TextStream } from '../../streams/TextStream.js';
import { TextStreamEntity } from '../../streams/TextStreamEntity.js';
import { SynonymReader } from '../../readers/SynonymReader.js';

export class HyperSkipPerformance {
    constructor(params={}) {
        this.params = { 
            streamLength: 3,
            hideEditorText: true,  // whether to hide the editor text
            drawOutlines: false,
            slideRate: 4000,
            animationSpeed: 500,
            toggleRecalibrate: false,
            textHidden: true,
            fontSize: 16,
            initialText: '',
            ...params 
        };
        // Settings should match a corresponding default value in this.params
        // Settings names and descriptions will appear in the controls - currently in Controls.js
        this.settings = [
            { name: 'textHidden', type: 'boolean', description: 'View your own text rather than the replacements'},
            { name: 'fontSize', type: 'number', description: 'Font size for the editor text (px)'},
            { name: 'drawOutlines', type: 'boolean', description: 'Debugging tool to show bounding boxes for each word'},
            { name: 'slideRate', type: 'number', description: 'Time between each word popping (ms).'},
            { name: 'animationSpeed', type: 'number', description: 'Speed of the animation when a word pops'},
            { name: 'toggleRecalibrate', type: 'boolean', description: 'Recalibrate the word boxes when the setting changes'},
        ]
        this.state = {
            tokenBoxes: [],  // stores bounding boxes for each word
            streams: []    // TextStreamEntity for each word
        };
        this.editor = null;
        this.overlay = null;
        this.inputHandler = null;
    }

    initialize() {
        this.editor = document.getElementById('editor');
        this.overlay = document.getElementById('overlay');
        
        if (this.editor) {
            this.inputHandler = () => this.updateWordBoxes();
            this.editor.addEventListener('input', this.inputHandler);
            this.editor.classList.toggle('text-hidden', this.params.hideEditorText);
        }
        
        this.resizeHandler = () => this.updateWordBoxes();
        window.addEventListener('resize', this.resizeHandler);

        console.log("HyperSkipPerformance.initialize() initialText", this.params.initialText);

        if (this.params.initialText) {
            this.editor.innerText = this.params.initialText;
            this.updateWordBoxes();
        }
    }

    updateSetting(name, value) {
        if (!(name in this.params)) {
            let validNames = Object.keys(this.params).join(', ');
            throw new Error(`Invalid setting name: ${name}. Valid names: ${validNames}`);
        }

        let oldValue = this.params[name];
        this.params[name] = value;
        
        // Apply special behaviors for certain settings
        if (name === 'drawOutlines') {
            if (value) {
                this.drawOutlines();
            } else {
                this.overlay.querySelectorAll('.word-box').forEach(el => el.remove());
            }
        } else if (name === 'toggleRecalibrate') {
            if (value !== oldValue) {
                this.updateWordBoxes();
            }
        } else if (name === 'textHidden') {
            this.toggleTextHidden(value);
        } else if (name === 'fontSize') {
            this.editor.style.fontSize = `${value}px`;
            this.overlay.style.fontSize = `${value}px`;
            // Clear all streams so they get recreated with new size
            this.state.streams.forEach(stream => stream.clear());
            this.state.streams = [];
            this.updateWordBoxes();
        }

    }

    getSetting(name) {
        if (!(name in this.params)) {
            let validNames = Object.keys(this.params).join(', ');
            throw new Error(`Invalid setting name: ${name}. Valid names: ${validNames}`);
        }
        return this.params[name];
    }

    getAllSettings() {
        let settings = {};
        this.settings.forEach((setting) => {
            const { name } = setting;
            settings[name] = {
                ...setting,
                value: this.getSetting(name),
            };
        });
        return settings;
    }

    getState() {
        let save = {
            text: this.editor?.innerText || ''
        };
        console.log("HyperSkipPerformance.getState() Save:", save);
        return save;
    }

    updateWordBoxes() {
        if (!this.editor || !this.overlay) return;
        
        this.state.tokenBoxes = this.getTokens(this.editor);

        if (this.params.drawOutlines) {
            this.drawOutlines();
        }

        this.drawOverlayWords();
        this.createStreams();
    }

    toggleTextHidden(textHidden) {
        this.editor.classList.toggle('text-hidden', textHidden);
        
        if (this.overlay) {
            this.overlay.style.visibility = textHidden ? 'visible' : 'hidden';
        }
    }


    // Use compromise on full editor text to get POS for each term (in order)
    getPOSList() {
        const text = this.editor?.innerText || '';
        const doc = nlp(text);
        const posList = [];
        
        const posTagMap = {
            'Noun': 'noun',
            'Verb': 'verb',
            'Adjective': 'adjective',
            'Adverb': 'adverb',
        };
        
        // Flatten all terms from all sentences, use first matching POS tag
        doc.json().forEach(sentence => {
            sentence.terms.forEach(term => {
                const tags = term.tags || [];
                let pos = null;
                for (const tag of tags) {
                    if (posTagMap[tag]) {
                        pos = posTagMap[tag];
                        break;
                    }
                }
                posList.push(pos);
            });
        });
        
        return posList;
    }

    createStreams() {
        const posList = this.getPOSList();
        
        this.state.tokenBoxes.forEach((tokenBox, i) => {
            const pos = posList[i] || null;
            
            if (this.state.streams[i]) { // Stream already exists

                // if the rect changed, update it
                if (this.state.streams[i].component.params.clipRect !== tokenBox.rect) {
                    this.state.streams[i].component.updateRect(tokenBox.rect);
                }
                
                // Update reader's word if it changed
                const reader = this.state.streams[i].textStream.reader;
                if (reader.word !== tokenBox.text) {
                    // Tell the reader resonsible for producing more words that the word has changed
                    reader.updateWord(tokenBox.text, pos);
                    // Tell the component responsible for rendering the words that the word has changed
                    this.state.streams[i].component.updateWord(tokenBox.text)
                }
                return;
            }
            
            // If stream doesn't exist, create it
            this.createReaderAndStream(tokenBox, i, pos);
        });

        // Trim extra streams if word count decreased
        while (this.state.streams.length > this.state.tokenBoxes.length) {
            const extra = this.state.streams.pop();
            extra.clear();
        }

        window.streams = this.state.streams;
    }

    createReaderAndStream(tokenBox, i, pos = null) {
        const reader = new SynonymReader(tokenBox.text);
        reader.updateWord(tokenBox.text, pos); // fetch synonyms with POS context
        const textStream = new TextStream(this.params.streamLength, reader);

        const component = new HyperSkipTextStreamComponent(this, {
            clipRect: tokenBox.rect,
            blockWidth: tokenBox.rect.width,
            blockHeight: tokenBox.rect.height,
            animationSpeed: this.params.animationSpeed,
            hidden: true,
        });

        const streamEntity = new TextStreamEntity(this, textStream, component);
        this.state.streams[i] = streamEntity;

        this.callPop(streamEntity, i);
    }

    callPop(entity, i) {
        // let newRate = (1 + Math.random()) * this.params.slideRate;
        let newRate =  this.params.slideRate / Math.min(10, entity?.textStream?.reader.getStreamLength() || 1);
        newRate += Math.random() * this.params.slideRate / 10;

        
        entity.component.popTimeoutId = setTimeout(() => {
            let synonymCount = entity.textStream.reader.getStreamLength();
            let shouldPop = synonymCount > 1;
            if (!shouldPop) {
                let currentTokens = new Set(entity.textStream.tokens.map(token => token?.text ?? ''));
                let currentWord = entity?.textStream?.reader?.word || '';
                if (currentTokens.size > 1 || !currentTokens.has(currentWord)) {
                    shouldPop = true;
                }
            }
            if (shouldPop) {
                entity.pop();
                // Check if the newest token matches the base word
                const tokens = entity.textStream.tokens;
                const newestToken = tokens[0];
                const currentWord = entity.textStream.reader.word;
                if (newestToken?.text === currentWord) {
                    entity.component.setHidden(false);
                }
            }
            this.callPop(entity, i);
            this.drawOverlayWords();
        }, newRate);
    }

    getTokens(element) {
        const words = [];
        
        const processTextNode = (textNode) => {
            const text = textNode.nodeValue;
            const tokens = text.split(/\s+/);
            let currentIndex = 0;
            
            for (const token of tokens) {
                if (token.length === 0) continue;
                
                const startIndex = text.indexOf(token, currentIndex);
                if (startIndex === -1) continue;
                const endIndex = startIndex + token.length;
                currentIndex = endIndex;
                
                try {
                    const range = document.createRange();
                    range.setStart(textNode, startIndex);
                    range.setEnd(textNode, endIndex);
                    const rect = range.getBoundingClientRect();
                    
                    words.push({
                        text: token,
                        rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height, bottom: rect.bottom, right: rect.right }
                    });
                } catch (e) {}
            }
        };
        
        const traverse = (node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                processTextNode(node);
            } else {
                for (const child of node.childNodes) traverse(child);
            }
        };
        
        traverse(element);
        return words;
    }

    drawOutlines() {
        // clear the boxes
        this.overlay.querySelectorAll('.word-box').forEach(el => el.remove());
        
        this.state.tokenBoxes.forEach(word => {
            const box = document.createElement('div');
            box.className = 'word-box';
            box.style.left = `${word.rect.left}px`;
            box.style.top = `${word.rect.top}px`;
            box.style.width = `${word.rect.width}px`;
            box.style.height = `${word.rect.height}px`;
            this.overlay.appendChild(box);
        });
    }

    drawOverlayWords() {
        // Clear existing word overlays
        this.overlay.querySelectorAll('.word-overlay').forEach(el => el.remove());
        
        this.state.tokenBoxes.forEach((tokenBox, i) => {
            const stream = this.state.streams[i];

            let shouldDraw = true;
            if (!stream) {
                shouldDraw = true;
            } 
            else {
                shouldDraw = stream.component.params.hidden;
            }
            
            if (shouldDraw) {
                const wordEl = document.createElement('div');
                wordEl.className = 'word-overlay';
                wordEl.textContent = tokenBox.text;
                wordEl.style.position = 'absolute';
                wordEl.style.left = `${tokenBox.rect.left}px`;
                wordEl.style.top = `${tokenBox.rect.top}px`;
                this.overlay.appendChild(wordEl);
            }
        });
    }

    setClipped(clipped) {
        this.params.clipped = clipped;
        this.updateWordBoxes();  // rebuild with new setting
    }
}