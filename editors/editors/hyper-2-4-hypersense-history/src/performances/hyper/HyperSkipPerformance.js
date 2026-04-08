import { HyperSkipTextStreamComponent } from './HyperSkipTextStreamComponent.js';
import { TextStream } from '../../streams/TextStream.js';
import { TextStreamEntity } from '../../streams/TextStreamEntity.js';
import { SynonymReader } from '../../readers/SynonymReader.js';
import { setSource } from '../../words/synonyms.js';
import { SettingsMixin } from '/editors/vault/01-23-2026/src/performances/SettingsMixin.js';
import { BasicEditor } from './BasicEditor.js';
import { Monitor } from '/editors/vault/01-23-2026/src/monitor/Monitor.js';
import { iterateContentEditableWords } from '/editors/vault/01-23-2026/src/document/textIterator.js';

export class HyperSkipPerformance extends SettingsMixin(class {}) {
    constructor(params={}) {
        super();
        this.params = { 
            ...BasicEditor.params,

            streamLength: 3,
            baseHeight: BasicEditor.calcBaseHeight(this),

            hideEditorText: true,  // whether to hide the editor text
            drawOutlines: false,

            numSlidesPerStroke: 5,
            typingSlideMode: 'proximate',


            automaticSlide: true,
            slideRate: 4,
            animationSpeedSec: 0.5,
            typingSlide: false,

            textMask: true,
            initialText: '',
            synonymSource: 'synonyms-cache',

            fontSize: 24,

            ...params 
        };
        // Settings should match a corresponding default value in this.params
        // Settings names and descriptions will appear in the controls - currently in Controls.js
        this.settings = [
            ...BasicEditor.settings,

            { id: 'textMask', name: 'Play', type: 'boolean', description: 'Turning this off will show the text that you wrote, rather than the sliding text.', inBar: true },

            { id: 'automaticSlide', name: 'Auto Slide', type: 'boolean', description: 'When true, automatically cycle through synonyms over time', inBar: true },
            { id: 'slideRate', name: 'Slide Rate (s)', type: 'number', description: 'Seconds between synonym changes.', inBar: true },
            { id: 'animationSpeedSec', name: 'Animation Speed (s)', type: 'number', description: 'Duration of synonym change animation.', inBar: true },

            { id: 'typingSlide', name: 'Slide on Type', type: 'boolean', description: 'When active, each keystroke will make words slide. You may want to turn off automatic slide when this is enabled.', inBar: true },
            { id: 'typingSlideMode', name: 'Slide on Type Mode', type: 'select', description: 'When Slide on Type is active, this decides which words are chosen to slide.', options: ['random', 'sequential', 'proximate'], inBar: false },
            { id: 'numSlidesPerStroke', name: 'Slides per Keystroke', type: 'number', description: 'When Slide on Type is active, this controls how many words slide per keystroke.'},

            { id: 'synonymSource', name: 'Synonyms', type: 'select', description: 'Where are the synonyms pulled from? WordNet is historically the most used database for word relationships. Wordhoard uses various online dictionaries.', inBar: true, options: [
                { value: 'synonyms-wordnet', label: 'WordNet' },
                { value: 'synonyms-cache', label: 'Wordhoard' },
                { value: 'misspellings', label: 'Mispelling' },
                { value: 'synonyms-online', label: 'Wordhoard Online (Slow)' },
            ] },

            { id: 'fontSize', name: 'Font Size', type: 'number', description: 'Font size for the editor text (px)' , inBar: true },

            { id: 'drawOutlines', name: 'Debug Outlines', type: 'boolean', description: 'Show bounding boxes for each word' },
        ]
        this.state = {
            tokenBoxes: [],  // { text, rect, streamKey, startIndex, endIndex, tokenIndex } per word in doc order
            streams: [],    // TextStreamEntity aligned with tokenBoxes (parallel array)
            streamEntitiesByKey: new Map(), // stable key: t{tokenIndex} from Monitor, or p{start}_{end} until word completes
        };
        this.editor = null;
        this.overlay = null;
        this.inputHandler = null;
        this.monitor = null;
    }


    initialize() {
        this.editor = document.getElementById('editor');
        this.overlay = document.getElementById('overlay');

        // set the size 
        BasicEditor.onSettingChanged(this, 'width', this.params.width, null);

        // set the darm mode
        BasicEditor.onSettingChanged(this, 'darkmode', this.params.darkmode, null);

        this.onSettingChanged('fontSize', this.params.fontSize, null);

        setSource(this.params.synonymSource);
        
        if (this.editor) {
            this.monitor = new Monitor(this.editor);
            this.monitor.on('token', (token) => this._onMonitorToken(token));

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

        requestAnimationFrame(() => {
        if (this.params.initialText) {
            this.clearAllStreams();
                this.editor.innerText = this.params.initialText;
                requestAnimationFrame(() => this.updateWordBoxes());
            }
        });

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
            this.clearAllStreams();
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

    clearAllStreams() {
        this.state.streamEntitiesByKey.forEach(stream => {
            clearTimeout(stream.component.popTimeoutId);
            stream.clear();
        });
        this.state.streamEntitiesByKey.clear();
        this.state.streams = [];
        this.state.tokenBoxes = [];
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

    _onMonitorToken(token) {
        const cur = this.monitor.getTokenCurrentPos(token);
        if (!cur) return;
        const id = this.monitor.charIds?.[cur.startPos];
        let pendingKey = id != null ? `p$c${id}` : null;
        let entity = pendingKey ? this.state.streamEntitiesByKey.get(pendingKey) : null;
        if (!entity) {
            pendingKey = `p${cur.startPos}_${cur.endPos}`;
            entity = this.state.streamEntitiesByKey.get(pendingKey);
        }
        if (!entity) return;
        this.state.streamEntitiesByKey.delete(pendingKey);
        const newKey = `t${token.tokenIndex}`;
        this.state.streamEntitiesByKey.set(newKey, entity);
        entity._streamKey = newKey;
    }

    /** Pending stream key: charIds[i] is stable when offsets shift; else fall back to span. */
    _pendingStreamKeyForWord(word) {
        const ids = this.monitor?.charIds;
        const doc = this.monitor?.text ?? '';
        if (ids?.length === doc.length && word.startIndex < ids.length) {
            const cid = ids[word.startIndex];
            if (cid != null) return `p$c${cid}`;
        }
        return `p${word.startIndex}_${word.endIndex}`;
    }

    /** Match monitor.tokens by current span (not activeTokens — that list is wrong after edits before a word). */
    _findMonitorTokenForWord(word) {
        if (!this.monitor) return null;
        const doc = this.monitor.text;
        for (const t of this.monitor.tokens) {
            const cur = this.monitor.getTokenCurrentPos(t);
            if (!cur) continue;
            if (cur.startPos !== word.startIndex || cur.endPos !== word.endIndex) continue;
            if (doc.slice(cur.startPos, cur.endPos) !== word.text) continue;
            return t;
        }
        return null;
    }

    getWordSlots() {
        const words = iterateContentEditableWords(this.editor);
        const slots = [];
        for (const w of words) {
            if (!w.text) continue;
            const rel = w.rect?.relative;
            if (!rel || w.rect == null) continue;
            const rect = {
                top: rel.top,
                left: rel.left,
                width: w.rect.width,
                height: w.rect.height,
                bottom: rel.top + w.rect.height,
                right: rel.left + w.rect.width,
            };
            const monTok = this._findMonitorTokenForWord(w);
            const streamKey = monTok != null ? `t${monTok.tokenIndex}` : this._pendingStreamKeyForWord(w);
            slots.push({
                text: w.text,
                rect,
                startIndex: w.startIndex,
                endIndex: w.endIndex,
                streamKey,
                tokenIndex: monTok?.tokenIndex ?? null,
            });
        }
        return slots;
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
        
        this.state.tokenBoxes = this.getWordSlots();

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
        const n = this.state.tokenBoxes.length;
        const usedKeys = new Set();

        for (let index = 0; index < n; index++) {
            const tokenBox = this.state.tokenBoxes[index];
            const pos = posList[index] || null;
            const streamKey = tokenBox.streamKey;
            usedKeys.add(streamKey);

            let stream = this.state.streamEntitiesByKey.get(streamKey);

            if (stream) {
                const pr = stream.component.params.clipRect;
                const r = tokenBox.rect;
                if (!pr || !r || Math.abs(pr.left - r.left) >= 0.5 || Math.abs(pr.top - r.top) >= 0.5
                    || Math.abs(pr.width - r.width) >= 0.5 || Math.abs(pr.height - r.height) >= 0.5) {
                    stream.component.updateRect(r);
                }
                
                // Update reader's word if it changed
                const reader = stream.textStream.reader;
                if (reader.word !== tokenBox.text) {
                    if (!tokenBox.text) {
                        console.error('Attempting to update reader with undefined text:', tokenBox, 'at index', index);
                        continue;
                    }
                    reader.updateWord(tokenBox.text, pos).then(() => this._afterSynonymsReady(stream));
                    stream.component.updateWord(tokenBox.text);
                }
                stream._streamKey = streamKey;
                this.state.streams[index] = stream;
                continue;
            }

            this.createReaderAndStream(tokenBox, index, pos, streamKey);
        }

        for (const [key, ent] of [...this.state.streamEntitiesByKey.entries()]) {
            if (!usedKeys.has(key)) {
                clearTimeout(ent.component.popTimeoutId);
                ent.clear();
                this.state.streamEntitiesByKey.delete(key);
            }
        }

        this.state.streams.length = n;
        window.streams = this.state.streams;
    }

    createReaderAndStream(tokenBox, i, pos = null, streamKey) {
        if (!tokenBox || !tokenBox.text) {
            console.error('createReaderAndStream called with invalid tokenBox:', tokenBox, 'at index', i);
            return;
        }
        const reader = new SynonymReader(tokenBox.text);
        const textStream = new TextStream(this.params.streamLength, reader);

        const component = new HyperSkipTextStreamComponent(this, {
            clipRect: tokenBox.rect,
            blockWidth: tokenBox.rect.width,
            blockHeight: tokenBox.rect.height,
            animationSpeed: this.params.animationSpeedSec * 1000,
        });

        const streamEntity = new TextStreamEntity(this, textStream, component);
        streamEntity._streamKey = streamKey;
        this.state.streamEntitiesByKey.set(streamKey, streamEntity);
        this.state.streams[i] = streamEntity;

        reader.updateWord(tokenBox.text, pos).then(() => this._afterSynonymsReady(streamEntity));

        this.callPop(streamEntity, i);
        if (this.params.automaticSlide) {
            this.automaticSlide(streamEntity, i);
        }
    }

    callPop(entity, i) {
        this._doPop(entity);
    }

    /** Run when async synonym fetch finishes so we are not stuck until the next long slide tick. */
    _afterSynonymsReady(entity) {
        const key = entity?._streamKey;
        if (!entity || this.state.streamEntitiesByKey.get(key) !== entity) return;
        this._doPop(entity);
        if (this.params.automaticSlide) {
            clearTimeout(entity.component.popTimeoutId);
            this.automaticSlide(entity, null);
        }
    }

    automaticSlide(entity, i) {
        let streamLen =  Math.min(10, entity?.textStream?.reader.getStreamLength() || 1);
        
        let newRate = this.params.slideRate * 1000 / streamLen;

        entity.component.popTimeoutId = setTimeout(() => {
            this._doPop(entity);
            this.automaticSlide(entity, i);
        }, newRate);
    }

   _doPop(entity) {
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