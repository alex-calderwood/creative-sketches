import { HyperTextStream } from './HyperTextStream.js';
import { TextStream } from '../../streams/TextStream.js';
import { TextStreamEntity } from '../../streams/TextStreamEntity.js';
import { RepeatingReader } from '../../readers/RepeatingReader.js';

export class HyperPerformance {
    constructor(params={}) {
        this.params = { 
            streamLength: 5,
            hideEditorText: true,  // whether to hide the editor text
            drawBoxes: false,
            slideRate: 1000,
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
        this.createStreams();
    }

    createStreams() {
        this.state.wordBoxes.forEach((wordBox, i) => {
            if (this.state.streams[i]) {
                this.state.streams[i].textStream.print();
                // Update reader's word if it changed
                const reader = this.state.streams[i].textStream.reader;
                console.log('reader.word', reader.word, 'wordBox.text', wordBox.text, reader);
                if (reader.word !== wordBox.text) {
                    reader.updateWord(wordBox.text);
                    this.state.streams[i].component.updateWidth(wordBox.rect.width);
                    console.log('updated reader', reader.word);
                    this.state.streams[i].textStream.print();
                }
                return;
            }
            
            const reader = new RepeatingReader(wordBox.text);
            const textStream = new TextStream(this.params.streamLength, reader);

            const component = new HyperTextStream(this, {
                clipRect: wordBox.rect,
                blockWidth: wordBox.rect.width,
                blockHeight: wordBox.rect.height,
                slideRate: this.params.slideRate,
            });

            const entity = new TextStreamEntity(this, textStream, component);
            this.state.streams[i] = entity;
        });

        // Trim extra streams if word count decreased
        while (this.state.streams.length > this.state.wordBoxes.length) {
            const extra = this.state.streams.pop();
            extra.clear();
        }
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

    setClipped(clipped) {
        this.params.clipped = clipped;
        this.updateWordBoxes();  // rebuild with new setting
    }

    tick() {
        this.state.streams.forEach(entity => {
            entity.pop();
        });
    }

    render(time) {}
}