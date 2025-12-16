import { HyperTextStreamComponent } from './HyperTextStreamComponent.js';
import { TextStream } from '../../streams/TextStream.js';
import { TextStreamEntity } from '../../streams/TextStreamEntity.js';
import { SynonymReader } from '../../readers/SynonymReader.js';

export class HyperPerformance {
    constructor(params={}) {
        this.params = { 
            streamLength: 3,
            hideEditorText: true,  // whether to hide the editor text
            drawBoxes: false,
            slideRate: 4000,
            animationSpeed: 500,
            ...params 
        };
        this.state = {
            wordBoxes: [],  // stores bounding boxes for each word
            streams: []    // TextStreamEntity for each word
        };
        this.editor = null;
        this.overlay = null;
    }

    initialize() {
        this.editor = document.getElementById('editor');
        this.overlay = document.getElementById('overlay');
        
        if (this.editor) {
            this.editor.addEventListener('input', () => this.updateWordBoxes());
            this.editor.classList.toggle('text-hidden', this.params.hideEditorText);
        }
    }

    updateWordBoxes() {
        if (!this.editor || !this.overlay) return;
        
        this.state.wordBoxes = this.getWords(this.editor);

        if (this.params.drawBoxes) {
            this.drawBoxes();
        }
        this.drawOverlayWords(); // needed when the streams 
        this.createStreams();
    }

    createStreams() {
        this.state.wordBoxes.forEach((wordBox, i) => {
            if (this.state.streams[i]) {
                // Update reader's word if it changed
                const reader = this.state.streams[i].textStream.reader;
                if (reader.word !== wordBox.text) {
                    reader.updateWord(wordBox.text);
                    
                    // this.state.streams[i].component.updateWidth(wordBox.rect.width);
                    this.state.streams[i].component.updateWord(wordBox.text, wordBox.rect.width);
                }
                return;
            }
            
            this.createReaderAndStream(wordBox, i);
        });

        // Trim extra streams if word count decreased
        while (this.state.streams.length > this.state.wordBoxes.length) {
            const extra = this.state.streams.pop();
            extra.clear();
        }
    }

    createReaderAndStream(wordBox, i) {
        const reader = new SynonymReader(wordBox.text);
        const textStream = new TextStream(this.params.streamLength, reader);

        const component = new HyperTextStreamComponent(this, {
            clipRect: wordBox.rect,
            blockWidth: wordBox.rect.width,
            blockHeight: wordBox.rect.height,
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
        
        setTimeout(() => {
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

    getWords(element) {
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

    drawBoxes() {
        this.overlay.innerHTML = '';
        const editorRect = this.editor.getBoundingClientRect();
        
        this.state.wordBoxes.forEach(word => {
            const box = document.createElement('div');
            box.className = 'word-box';
            box.style.left = `${word.rect.left - editorRect.left}px`;
            box.style.top = `${word.rect.top - editorRect.top}px`;
            box.style.width = `${word.rect.width}px`;
            box.style.height = `${word.rect.height}px`;
            this.overlay.appendChild(box);
        });
    }

    drawOverlayWords() {
        // Clear existing word overlays
        this.overlay.querySelectorAll('.word-overlay').forEach(el => el.remove());
        
        const editorRect = this.editor.getBoundingClientRect();
        
        this.state.wordBoxes.forEach((wordBox, i) => {
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
                wordEl.textContent = wordBox.text;
                wordEl.style.position = 'absolute';
                wordEl.style.left = `${wordBox.rect.left - editorRect.left}px`;
                wordEl.style.top = `${wordBox.rect.top - editorRect.top}px`;
                this.overlay.appendChild(wordEl);
            }
        });
    }

    setClipped(clipped) {
        this.params.clipped = clipped;
        this.updateWordBoxes();  // rebuild with new setting
    }
}