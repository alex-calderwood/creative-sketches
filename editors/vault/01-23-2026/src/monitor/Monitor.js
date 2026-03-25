import { Emitter } from './Emitter.js';
import { getGlobalTextOffset, getEditableText, getTextNodeAtOffset } from '../document/textIterator.js';

/**
 * Attaches to a contenteditable element and records all edits in real time.
 *
 * Streams:
 *   events       — every keystroke (insert, delete, undo, redo), each with a text snapshot
 *   tokens       — completed words, appended as the user types past a word boundary
 *   activeTokens — subset of tokens still intact in the current document text
 *   chars        — every inserted character, in insertion order
 *   charIds      — maps current document positions to chars[] indices (mirrors this.text)
 *
 * Each char carries both its original location (rect, originalPos) and can be
 * looked up at its current document position via charIds. Tokens store their
 * constituent charIndices for the same purpose.
 *
 * Provenance queries:
 *   getCharCurrentPos(charIndex)  → current doc offset (-1 if deleted)
 *   getCharOriginAt(docPos)       → the chars[] entry that produced this position
 *   getCurrentRect(docPos, len)   → live DOM rect at a current document position
 *   getTokenCurrentPos(token)     → { startPos, endPos } in current document
 *
 * Enriched accessors (getCharAt, getTokenAt, getActiveCharAt) return objects
 * with both original and current position data.
 *
 * Emits: 'keystroke' on each edit, 'token' when a new word is completed.
 * Use import/export to persist and restore session data.
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
    this.charIds = [];   // charIds[docPos] = index into this.chars (mirrors this.text)
    this.text = '';
    this.startTime = Date.now();

    this._boundOnBeforeInput = this._onBeforeInput.bind(this);
    this._boundOnInput = this._onInput.bind(this);

    this.element.addEventListener('beforeinput', this._boundOnBeforeInput);
    this.element.addEventListener('input', this._boundOnInput);
  }

  _getRect(startOffset, endOffset) {
    try {
      const start = getTextNodeAtOffset(this.element, startOffset);
      const end = getTextNodeAtOffset(this.element, endOffset);
      if (!start || !end) return null;

      const range = document.createRange();
      range.setStart(start.node, start.offset);
      range.setEnd(end.node, end.offset);
      const rect = range.getBoundingClientRect();
      const parentRect = this.element.getBoundingClientRect();

      return {
        top: rect.top - parentRect.top,
        left: rect.left - parentRect.left,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        relative: {
          top: rect.top,
          left: rect.left,
        },
      };
    } catch (e) {
      return null;
    }
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
      const baseOffset = cursorAfter - event.data.length;
      const firstCharIndex = this.chars.length;
      const newIds = [];
      // One charIds entry per UTF-16 code unit (matches getEditableText / string.length). String
      // iteration with for..of uses code points, which under-counts surrogate pairs and triggers
      // charIds/text length mismatch warnings.
      for (let i = 0; i < event.data.length; i++) {
        const ch = event.data[i];
        this.chars.push({
          ch, timestamp: event.timestamp, keystrokeIndex: event.index,
          originalPos: baseOffset + i,
          rect: this._getRect(baseOffset + i, baseOffset + i + 1),
        });
        newIds.push(firstCharIndex + i);
      }
      const splicePos = this._selectionLength > 0 ? this._selStart : baseOffset;
      this.charIds.splice(splicePos, this._selectionLength, ...newIds);
    }

    if (event.type === 'delete') {
      this.charIds.splice(cursorAfter, event.data.length);
    }

    if (event.type === 'undo' || event.type === 'redo') {
      const prevSnapshot = this.events.length >= 2
        ? this.events[this.events.length - 2].textSnapshot : '';
      this._patchCharIdsFromDiff(prevSnapshot, this.text, event);
    }

    if (this.charIds.length !== this.text.length) {
      console.warn(`charIds/text length mismatch (${this.charIds.length} vs ${this.text.length}), rebuilding`);
      this._rebuildCharIds();
    }

    this._emit('keystroke', event);

    if (event.type === 'insert' && event.data && [...event.data].some(c => this._isTokenBoundary(c))) {
      this._detectTokens();
    }

    if (event.type === 'delete' || event.type === 'undo' || event.type === 'redo') {
      this._validateTokens();
    }
  }

  _diffTexts(oldText, newText) {
    let pre = 0;
    while (pre < oldText.length && pre < newText.length && oldText[pre] === newText[pre]) pre++;
    let suf = 0;
    while (suf < oldText.length - pre && suf < newText.length - pre &&
           oldText[oldText.length - 1 - suf] === newText[newText.length - 1 - suf]) suf++;
    return {
      prefix: pre,
      oldFrom: pre, oldTo: oldText.length - suf,
      newFrom: pre, newTo: newText.length - suf,
    };
  }

  _patchCharIdsFromDiff(oldText, newText, event) {
    const d = this._diffTexts(oldText, newText);
    this.charIds.splice(d.oldFrom, d.oldTo - d.oldFrom);
    const insertLen = d.newTo - d.newFrom;
    if (insertLen > 0) {
      const baseIndex = this.chars.length;
      const newIds = [];
      const insertedText = newText.slice(d.newFrom, d.newTo);
      for (let j = 0; j < insertedText.length; j++) {
        const ch = insertedText[j];
        this.chars.push({
          ch, timestamp: event.timestamp, keystrokeIndex: event.index,
          originalPos: d.newFrom + j,
          rect: this._getRect(d.newFrom + j, d.newFrom + j + 1),
        });
        newIds.push(baseIndex + j);
      }
      this.charIds.splice(d.newFrom, 0, ...newIds);
    }
  }

  _rebuildCharIds() {
    this.charIds = [];
    let charCounter = 0;
    let prevText = '';
    for (const event of this.events) {
      const newText = event.textSnapshot;
      if (event.type === 'insert' && event.data) {
        const insertPos = event.cursorAfter - event.data.length;
        const deletedLen = prevText.length + event.data.length - newText.length;
        const newIds = [];
        for (let j = 0; j < event.data.length; j++) { newIds.push(charCounter++); }
        this.charIds.splice(insertPos, deletedLen, ...newIds);
      } else if (event.type === 'delete') {
        this.charIds.splice(event.cursorAfter, event.data.length);
      } else if (event.type === 'undo' || event.type === 'redo') {
        const d = this._diffTexts(prevText, newText);
        this.charIds.splice(d.oldFrom, d.oldTo - d.oldFrom);
        const insertLen = d.newTo - d.newFrom;
        if (insertLen > 0) {
          const newIds = [];
          for (let i = 0; i < insertLen; i++) newIds.push(charCounter++);
          this.charIds.splice(d.newFrom, 0, ...newIds);
        }
      }
      prevText = newText;
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
        rect: this._getRect(startPos, endPos),
        charIndices: this.charIds.slice(startPos, endPos),
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

  // Provenance queries
  getCharCurrentPos(charIndex) {
    return this.charIds.indexOf(charIndex);
  }

  getCharOriginAt(docPos) {
    if (docPos < 0 || docPos >= this.charIds.length) return null;
    return this.chars[this.charIds[docPos]] || null;
  }

  getCurrentRect(docPos, length = 1) {
    return this._getRect(docPos, docPos + length);
  }

  getTokenCurrentPos(token) {
    if (!token.charIndices || token.charIndices.length === 0) return null;
    const first = this.getCharCurrentPos(token.charIndices[0]);
    const last = this.getCharCurrentPos(token.charIndices[token.charIndices.length - 1]);
    if (first === -1 || last === -1) return null;
    return { startPos: first, endPos: last + 1 };
  }

  // Query (enriched with current position data)
  getKeystrokeAt(index) { return this.events[index] || null; }

  getTokenAt(index) {
    const token = this.tokens[index];
    if (!token) return null;
    const cur = this.getTokenCurrentPos(token);
    return {
      ...token,
      currentStartPos: cur?.startPos ?? -1,
      currentEndPos: cur?.endPos ?? -1,
      alive: cur !== null,
    };
  }

  getActiveTokenAt(index) {
    const token = this.activeTokens[index];
    if (!token) return null;
    const cur = this.getTokenCurrentPos(token);
    return {
      ...token,
      currentStartPos: cur?.startPos ?? -1,
      currentEndPos: cur?.endPos ?? -1,
      alive: cur !== null,
    };
  }

  getCharAt(index) {
    const char = this.chars[index];
    if (!char) return null;
    const currentPos = this.getCharCurrentPos(index);
    return {
      ...char,
      charIndex: index,
      currentPos,
      alive: currentPos !== -1,
    };
  }

  getActiveCharAt(index) {
    if (index < 0 || index >= this.text.length) return null;
    const charIndex = this.charIds[index];
    const origin = charIndex != null ? this.chars[charIndex] : null;
    return {
      ch: this.text[index],
      docPos: index,
      charIndex,
      origin,
    };
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
    this.charIds = data.charIds || [];
    this.startTime = data.startTime || Date.now();
    const last = this.events[this.events.length - 1];
    this.text = last ? last.textSnapshot : '';
    this.activeTokens = this.tokens.filter(t => t.active !== false);
    if (this.charIds.length === 0 && this.events.length > 0) {
      this._rebuildCharIds();
    }
  }

  export() {
    return {
      events: this.events,
      tokens: this.tokens,
      chars: this.chars,
      charIds: this.charIds,
      startTime: this.startTime,
    };
  }

  destroy() {
    this.element.removeEventListener('beforeinput', this._boundOnBeforeInput);
    this.element.removeEventListener('input', this._boundOnInput);
    this._listeners = {};
  }
}
