import { HyperSkipTextStreamComponent } from './HyperSkipTextStreamComponent.js';
import { TextStream } from '../../streams/TextStream.js';
import { TextStreamEntity } from '../../streams/TextStreamEntity.js';
import { SynonymReader } from '../../readers/SynonymReader.js';
import { setSource } from '../../words/synonyms.js';
import { SettingsMixin } from '/editors/vault/01-23-2026/src/performances/SettingsMixin.js';
import { BasicEditor } from './BasicEditor.js';

export class HyperSkipPerformance extends SettingsMixin(class {}) {
    constructor(params={}) {
        super();
        this.params = { 
            streamLength: 3,
            baseHeight: BasicEditor.calcBaseHeight(this),

            hideEditorText: true,  // whether to hide the editor text
            drawOutlines: false,

            numSlidesPerStroke: 20,
            typingSlideMode: 'random',

            fontSize: 20,

            automaticSlide: true,
            slideRate: 4,
            animationSpeed: 500,
            typingSlide: false,

            textMask: true,
            initialText: '',
            synonymSource: 'synonyms-cache',
            ...BasicEditor.params,
            ...params 
        };
        // Settings should match a corresponding default value in this.params
        // Settings names and descriptions will appear in the controls - currently in Controls.js
        this.settings = [
            ...BasicEditor.settings,

            { id: 'textMask', name: 'Text Mask', type: 'boolean', description: 'Show your own text rather than synonym replacements', inBar: true },
            { id: 'fontSize', name: 'Font Size', type: 'number', description: 'Font size for the editor text (px)' },

            { id: 'automaticSlide', name: 'Auto Slide', type: 'boolean', description: 'Automatically cycle through synonyms over time', inBar: true },
            { id: 'slideRate', name: 'Slide Rate (s)', type: 'number', description: 'Seconds between synonym changes', inBar: true },
            { id: 'animationSpeed', name: 'Animation Speed', type: 'number', description: 'Duration of word transition animation (ms)' },

            { id: 'typingSlide', name: 'Slide on Type', type: 'boolean', description: 'Slide streams when you type', inBar: true },
            { id: 'typingSlideMode', name: 'Slide Mode', type: 'select', description: 'How streams are chosen when you type', options: ['random', 'sequential', 'proximate'], inBar: true },
            { id: 'numSlidesPerStroke', name: 'Slides per Keystroke', type: 'number', description: 'Number of streams to slide per keystroke' },

            { id: 'synonymSource', name: 'Synonyms', type: 'select', description: 'Where are the synonyms pulled from? WordNet is historically the most used database for word relationships. Wordhoard uses various online dictionaries.', inBar: true, options: [
                { value: 'synonyms-wordnet', label: 'WordNet' },
                { value: 'synonyms-cache', label: 'Wordhoard' },
                { value: 'synonyms-online', label: 'Wordhoard Online (Slow)' },
            ] },

            { id: 'drawOutlines', name: 'Debug Outlines', type: 'boolean', description: 'Show bounding boxes for each word' },
        ]
        this.state = {
            tokenBoxes: [],  // stores bounding boxes for each word
            streams: []    // TextStreamEntity for each word
        };
        this.editor = null;
        this.overlay = null;
        this.inputHandler = null;

        window.getState = this.getState.bind(this);
    }


    initialize() {
        this.editor = document.getElementById('editor');
        this.overlay = document.getElementById('overlay');

        // set the size 
        BasicEditor.onSettingChanged(this, 'width', this.params.width, null);

        // set the darm mode
        BasicEditor.onSettingChanged(this, 'darkmode', this.params.darkmode, null);
        
        setSource(this.params.synonymSource);
        
        if (this.editor) {
            this.inputHandler = () => {
                this.updateWordBoxes();
                if (this.params.typingSlide) this.conductSlide();
            }
            this.editor.addEventListener('input', this.inputHandler);
            this.editor.classList.toggle('text-hidden', this.params.hideEditorText);
        }

        // this.syncOverlay();
        
        this.resizeHandler = () => this.updateWordBoxes();
        window.addEventListener('resize', this.resizeHandler);
        
        this.scrollHandler = () => this.updateWordBoxes();
        window.addEventListener('scroll', this.scrollHandler);

        // Setup submit button
        const submitButton = document.getElementById('submit-button');
        if (submitButton) {
            submitButton.addEventListener('click', () => this.showOnComplete());
        }

        // Setup modal buttons
        const modalCancel = document.getElementById('modal-cancel');
        const modalContinue = document.getElementById('modal-continue');
        const modal = document.getElementById('complete-modal');
        
        if (modalCancel) {
            modalCancel.addEventListener('click', () => {
                modal.style.display = 'none';
            });
        }
        
        if (modalContinue) {
            modalContinue.addEventListener('click', () => {
                // Continue button doesn't do anything yet
            });
        }

        console.log("HyperSkipPerformance.initialize() initialText", this.params.initialText);

        if (this.params.initialText) {
            this.editor.innerText = this.params.initialText;
            this.updateWordBoxes();
        }

    }

    onSettingChanged(name, value, oldValue) {
        // Apply special behaviors for certain settings
        if (name === 'drawOutlines') {
            if (value) {
                this.drawOutlines();
            } else {
                this.overlay.querySelectorAll('.word-box').forEach(el => el.remove());
            }
        } else if (name === 'textMask') {
            this.toggletextMask(value);
        } else if (name === 'fontSize') {
            this.editor.style.fontSize = `${value}px`;
            this.overlay.style.fontSize = `${value}px`;
            // Clear all streams so they get recreated with new size
            this.state.streams.forEach(stream => {
                clearTimeout(stream.component.popTimeoutId);
                stream.clear();
            });
            this.state.streams = [];
            this.updateWordBoxes();
        } else if (name === 'automaticSlide') {
            if (value && !oldValue) {
                this.state.streams.forEach(stream => this.automaticSlide(stream, stream.index));
            } else if (!value && oldValue) {
                this.state.streams.forEach(stream => clearTimeout(stream.component.popTimeoutId));
            }
        } else if (name === 'synonymSource') {
            setSource(value);
        }

        BasicEditor.onSettingChanged(this, name, value, oldValue);
    }

    getState() {
        let original = this.editor?.innerText || '';
        let alternate = this.getAlternateText() || '';
        let save = {
            text: alternate,
            alternate: alternate,
            original: original,
        };
        return save;
    }

    *iterateTokenBoxStreams() {
        for (let i = 0; i < this.state.tokenBoxes.length; i++) {
            yield {
                tokenBox: this.state.tokenBoxes[i],
                stream: this.state.streams[i],
                index: i
            };
        }
    }

    getAlternateText() {
        const words = [];
        let lastTop = null;
        
        for (const { tokenBox, stream } of this.iterateTokenBoxStreams()) {
            // Add line break if this token is on a new line
            if (lastTop !== null && Math.abs(tokenBox.rect.top - lastTop) > tokenBox.rect.height / 2) {
                const verticalDistance = Math.abs(tokenBox.rect.top - lastTop);
                const numLineBreaks = Math.round(verticalDistance / tokenBox.rect.height);
                words.push('\n'.repeat(numLineBreaks));
            }
            words.push(stream?.component.getDisplayWord() || tokenBox.text);
            lastTop = tokenBox.rect.top;
        }
        return words.join(' ');
    }

    showOnComplete() {
        const alternateText = this.getAlternateText();
        const modal = document.getElementById('complete-modal');
        const alternateTextEl = document.getElementById('alternate-text');
        
        if (alternateTextEl) {
            alternateTextEl.textContent = alternateText;
        }
        
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    /**
     * 1. Retrieve the word tokens again, computing the location of each word
     * 2. Draw the outlines of the words (if drawOutlines is on)
     * 3. Draw the overlay words (placeholders for the streams)
     * 4. Create or update the streams
     * @returns 
     * 
     */
    updateWordBoxes() {
        if (!this.editor || !this.overlay) return;
        
        this.state.tokenBoxes = this.getTokens(this.editor);

        if (this.params.drawOutlines) {
            this.drawOutlines();
        }

        this.drawOverlayWords();
        this.createOrUpdateStreams();
    }

    getCursorPosition() {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) {
            return { x: 0, y: 0 };
        }
        
        const range = selection.getRangeAt(0).cloneRange();
        range.collapse(true);
        
        const rect = range.getBoundingClientRect();
        return { x: rect.left, y: rect.top };
    }

    conductSlide() {
        var streamsToSlide = [];
        switch(this.params.typingSlideMode) {
            case 'random':
                // randomly generate 10 stream indexes
                let streamIndexes = Array.from({length: this.state.streams.length}, (_, i) => i);
                streamsToSlide = streamIndexes.sort(() => Math.random() - 0.5).slice(0, this.params.numSlidesPerStroke);
                break;
            case 'sequential':
                let previous = this.state.previousSlides || 0;
                let numSlides = this.params.numSlidesPerStroke;
                for (let i = previous; i < previous + numSlides; i++) {
                    let index = i % this.state.streams.length;
                    streamsToSlide.push(index);
                }
                this.state.previousSlides = (previous + numSlides + 1) % this.state.streams.length;
                break;
            case 'proximate':
                // get the streams nearest to the caret
                let caret = this.getCursorPosition();
                let distances = [];
                for (let i = 0; i < this.state.streams.length; i++) {
                    let stream = this.state.streams[i];
                    let streamRect = stream.component.params.clipRect;
                    let dist = (x1, y1, x2, y2) => (x1 - x2)**2 + (y1 - y2)**2;
                    distances.push({ index: i, distance: dist(caret.x, caret.y, streamRect.left, streamRect.top) });
                }
                let sorted = distances.sort((a, b) => a.distance - b.distance);
                streamsToSlide = sorted.slice(0, this.params.numSlidesPerStroke).map(item => item.index);
                // randonmly get rid of 50%
                streamsToSlide = streamsToSlide.filter(() => Math.random() > 0.5);
                break;
        }

        for (let i = 0; i < streamsToSlide.length; i++) {
            let streamIndex = streamsToSlide[i];
            let stream = this.state.streams[streamIndex];
            setTimeout(() => {
                this.callPop(stream, streamIndex);
            }, i * 100);
        }
    }

    toggletextMask(textMask) {
        this.editor.classList.toggle('text-hidden', textMask);
        
        if (this.overlay) {
            this.overlay.style.visibility = textMask ? 'visible' : 'hidden';
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

    createOrUpdateStreams() {
        const posList = this.getPOSList();
        
        for (const { tokenBox, stream, index } of this.iterateTokenBoxStreams()) {
            const pos = posList[index] || null;

            let updated = false;
            
            if (stream) { // Stream already exists
                // if the rect changed, update it
                if (stream.component.params.clipRect !== tokenBox.rect) {
                    stream.component.updateRect(tokenBox.rect);
                    updated = tokenBox.rect;
                }
                
                // Update reader's word if it changed
                const reader = stream.textStream.reader;
                if (reader.word !== tokenBox.text) {
                    if (!tokenBox.text) {
                        console.error('Attempting to update reader with undefined text:', tokenBox, 'at index', index);
                        continue;
                    }
                    // Tell the reader resonsible for producing more words that the word has changed
                    reader.updateWord(tokenBox.text, pos);
                    // Tell the component responsible for rendering the words that the word has changed
                    stream.component.updateWord(tokenBox.text)
                }
                continue;
            }
            
            // If stream doesn't exist, create it
            this.createReaderAndStream(tokenBox, index, pos);
        }

        // Trim extra streams if word count decreased
        while (this.state.streams.length > this.state.tokenBoxes.length) {
            const extra = this.state.streams.pop();
            clearTimeout(extra.component.popTimeoutId);
            extra.clear();
        }

        window.streams = this.state.streams;
    }

    createReaderAndStream(tokenBox, i, pos = null) {
        if (!tokenBox || !tokenBox.text) {
            console.error('createReaderAndStream called with invalid tokenBox:', tokenBox, 'at index', i);
            return;
        }
        const reader = new SynonymReader(tokenBox.text);
        reader.updateWord(tokenBox.text, pos); // fetch synonyms with POS context
        const textStream = new TextStream(this.params.streamLength, reader);

        const component = new HyperSkipTextStreamComponent(this, {
            clipRect: tokenBox.rect,
            blockWidth: tokenBox.rect.width,
            blockHeight: tokenBox.rect.height,
            animationSpeed: this.params.animationSpeed,
        });

        const streamEntity = new TextStreamEntity(this, textStream, component);
        this.state.streams[i] = streamEntity;

        this.callPop(streamEntity, i);
        if (this.params.automaticSlide) {
            this.automaticSlide(streamEntity, i);
        }
    }

    callPop(entity, i) {
        this._doPop(entity, i);
    }

    automaticSlide(entity, i) {
        let streamLen =  Math.min(10, entity?.textStream?.reader.getStreamLength() || 1);
        
        let newRate = this.params.slideRate * 1000 / streamLen;

        entity.component.popTimeoutId = setTimeout(() => {
            this._doPop(entity, i);
            this.automaticSlide(entity, i);
        }, newRate);
    }

   _doPop(entity, i) {
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
        }
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

            if (!stream) {
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