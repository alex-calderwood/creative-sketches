import { Emitter } from './Emitter.js';
import { getGlobalTextOffset, getEditableText } from './textIterator.js';

/**
 * Attaches to a contenteditable element and records all edits in real time.
 * Maintains three streams derived from the event log:
 *
 * events       — every keystroke (insert, delete, undo, redo), each with a text snapshot
 * tokens       — completed words, appended as the user types past a word boundary
 * activeTokens — subset of tokens still intact in the current document text
 * chars        — every inserted character, in insertion order
 *
 * Emits:
 *   monitor.on('keystroke', event => {})  — every edit ({type, data, cursorBefore, cursorAfter, timestamp, textSnapshot})
 *   monitor.on('token', token => {})      — word completed ({text, startPos, endPos, active, timestamp})
 * Use import/export to persist and restore session data.
 * 
 * Example: const monitor = new Monitor(document.querySelector('#editor')); // attaches and begins recording edits
 */
export class Monitor extends Emitter() {
  constructor(editorElement) {
    super();
    this._initEmitter();
    this.element = editorElement;
    this.events = [];
    this.tokens = [];
    this.activeTokens = [];
    this.chars = [];
    this.text = '';
    this.startTime = Date.now();

    this._boundOnBeforeInput = this._onBeforeInput.bind(this);
    this._boundOnInput = this._onInput.bind(this);

    this.element.addEventListener('beforeinput', this._boundOnBeforeInput);
    this.element.addEventListener('input', this._boundOnInput);
  }

  _getCursorPosition() {
    const selection = window.getSelection();
    if (!selection.rangeCount) return 0;
    const range = selection.getRangeAt(0);
    return getGlobalTextOffset(this.element, range.endContainer, range.endOffset);
  }

  _onBeforeInput(e) {
    const sel = window.getSelection();
    if (sel.rangeCount) {
      const range = sel.getRangeAt(0);
      this._selStart = getGlobalTextOffset(this.element, range.startContainer, range.startOffset);
      this._selEnd = getGlobalTextOffset(this.element, range.endContainer, range.endOffset);
    } else {
      this._selStart = this._selEnd = 0;
    }
    this._cursorBefore = this._selEnd;
    this._selectionLength = this._selEnd - this._selStart;
  }

  _onInput(e) {
    const now = Date.now();
    const cursorAfter = this._getCursorPosition();
    const type = e.inputType;

    let event = null;

    if (type === 'insertText') {
      event = {
        type: 'insert',
        data: e.data,
        cursorBefore: this._cursorBefore,
        cursorAfter,
        timestamp: now,
        index: this.events.length,
      };
    } else if (type === 'insertParagraph' || type === 'insertLineBreak') {
      event = {
        type: 'insert',
        data: '\n',
        cursorBefore: this._cursorBefore,
        cursorAfter,
        timestamp: now,
        index: this.events.length,
      };
    } else if (type === 'insertFromPaste' || type === 'insertFromDrop' || type === 'insertReplacementText') {
      const inserted = getEditableText(this.element).slice(this._cursorBefore, cursorAfter);
      event = {
        type: 'insert',
        data: inserted,
        cursorBefore: this._cursorBefore,
        cursorAfter,
        timestamp: now,
        index: this.events.length,
      };
    } else if (type === 'deleteContentBackward' || type === 'deleteContentForward' || type === 'deleteByCut') {
      let deletedText;
      if (this._selectionLength > 0) {
        deletedText = this.text.slice(this._selStart, this._selEnd);
      } else if (type === 'deleteContentForward') {
        deletedText = this.text.slice(this._cursorBefore, this._cursorBefore + 1);
      } else {
        deletedText = this.text.slice(this._cursorBefore - 1, this._cursorBefore);
      }
      event = {
        type: 'delete',
        inputType: type,
        data: deletedText,
        length: deletedText.length,
        cursorBefore: this._cursorBefore,
        cursorAfter,
        timestamp: now,
        index: this.events.length,
      };
    } else if (type === 'historyUndo' || type === 'historyRedo') {
      event = {
        type: type === 'historyUndo' ? 'undo' : 'redo',
        cursorBefore: this._cursorBefore,
        cursorAfter,
        timestamp: now,
        index: this.events.length,
      };
    }

    if (!event) return;

    this.text = getEditableText(this.element);
    event.textSnapshot = this.text;
    this.events.push(event);

    if (event.type === 'insert' && event.data) {
      for (const ch of event.data) {
        this.chars.push({ ch, timestamp: event.timestamp, keystrokeIndex: event.index });
      }
    }

    this._emit('keystroke', event);

    if (event.type === 'insert' && event.data && [...event.data].some(c => this._isTokenBoundary(c))) {
      this._detectTokens();
    }

    if (event.type === 'delete' || event.type === 'undo' || event.type === 'redo') {
      this._validateTokens();
    }
  }

  _tokenize(text) {
    return text.split(/\s+/).filter(w => w.length > 0);
  }

  _isTokenBoundary(char) {
    return /\s/.test(char);
  }

  _validateTokens() {
    this.activeTokens = [];
    for (const token of this.tokens) {
      token.active = this.text.slice(token.startPos, token.endPos) === token.text;
      if (token.active) this.activeTokens.push(token);
    }
  }

  _detectTokens() {
    const lastEvent = this.events[this.events.length - 1];
    if (!lastEvent || lastEvent.type !== 'insert') return;

    let scanStart = lastEvent.cursorBefore;
    while (scanStart > 0 && !this._isTokenBoundary(this.text[scanStart - 1])) {
      scanStart--;
    }

    const region = this.text.slice(scanStart, lastEvent.cursorAfter);
    const endsAtBoundary = region.length > 0 && this._isTokenBoundary(region[region.length - 1]);
    const words = this._tokenize(region);
    const complete = endsAtBoundary ? words : words.slice(0, -1);

    let pos = scanStart;
    for (const word of complete) {
      const startPos = this.text.indexOf(word, pos);
      const endPos = startPos + word.length;
      pos = endPos;

      const token = {
        text: word,
        startPos,
        endPos,
        active: true,
        tokenIndex: this.tokens.length,
        keystrokeIndex: lastEvent.index,
        timestamp: lastEvent.timestamp,
      };
      this.tokens.push(token);
      this.activeTokens.push(token);
      this._emit('token', token);
    }
  }

  getTextAtKeystroke(index) {
    if (index < 0 || index >= this.events.length) return '';
    return this.events[index].textSnapshot;
  }

  // Query
  getKeystrokeAt(index) { return this.events[index] || null; }
  getTokenAt(index) { return this.tokens[index] || null; }
  getActiveTokenAt(index) { return this.activeTokens[index] || null; }
  getCharAt(index) { return this.chars[index] || null; }
  getActiveCharAt(index) {
    const ch = this.text[index];
    return ch != null ? { ch, index } : null;
  }
  getKeystrokeCount() { return this.events.length; }
  getTokenCount() { return this.tokens.length; }
  getActiveTokenCount() { return this.activeTokens.length; }
  getCharCount() { return this.chars.length; }
  getActiveCharCount() { return this.text.length; }
  getDuration() {
    if (this.events.length === 0) return 0;
    return this.events[this.events.length - 1].timestamp - this.events[0].timestamp;
  }

  // Serialization
  import(data) {
    this.events = data.events || [];
    this.tokens = data.tokens || [];
    this.chars = data.chars || [];
    this.startTime = data.startTime || Date.now();
    const last = this.events[this.events.length - 1];
    this.text = last ? last.textSnapshot : '';
    this.activeTokens = this.tokens.filter(t => t.active !== false);
  }

  export() {
    return {
      events: this.events,
      tokens: this.tokens,
      chars: this.chars,
      startTime: this.startTime,
    };
  }

  destroy() {
    this.element.removeEventListener('beforeinput', this._boundOnBeforeInput);
    this.element.removeEventListener('input', this._boundOnInput);
    this._listeners = {};
  }
}
