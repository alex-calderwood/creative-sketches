import { Emitter } from './Emitter.js';

/**
 * A navigable cursor over a Monitor's recorded streams: keystrokes, tokens, and chars.
 * Each instance tracks an independent position in each stream.
 *
 * mode 'all'    — traverses the full history (every insert/delete ever recorded)
 * mode 'active' — traverses only items still present in the current document
 *
 * Navigation: next/previous/goTo for each stream (keystroke, token, char).
 * Offsets: getXAtOffset (relative to current position), getXFromHead (relative to latest).
 * Temporal: play/pause replays keystrokes at recorded speed.
 * Emits: 'position' on every keystroke move, 'play', 'pause', 'done'.
 *
 * Example: const playback = new Playback(monitor); const next = playback.nextKeystroke();
 */
export class Playback extends Emitter() {
  constructor(monitor, { mode = 'all' } = {}) {
    super();
    this._initEmitter();
    this.monitor = monitor;
    this.mode = mode;
    this.keystrokeIndex = -1;
    this.tokenIndex = -1;
    this.charIndex = -1;
    this._playTimer = null;
  }

  // Keystroke navigation
  nextKeystroke() {
    const next = this.keystrokeIndex + 1;
    if (next >= this.monitor.getKeystrokeCount()) return null;
    this.keystrokeIndex = next;
    this._syncTokenIndex();
    const event = this.monitor.getKeystrokeAt(next);
    this._emit('position', this.getCurrentState());
    return event;
  }

  previousKeystroke() {
    if (this.keystrokeIndex <= 0) return null;
    this.keystrokeIndex--;
    this._syncTokenIndex();
    const event = this.monitor.getKeystrokeAt(this.keystrokeIndex);
    this._emit('position', this.getCurrentState());
    return event;
  }

  goToKeystroke(index) {
    const clamped = Math.max(-1, Math.min(index, this.monitor.getKeystrokeCount() - 1));
    this.keystrokeIndex = clamped;
    this._syncTokenIndex();
    this._emit('position', this.getCurrentState());
    return this.monitor.getKeystrokeAt(clamped);
  }

  // Char navigation
  nextChar() {
    const next = this.charIndex + 1;
    if (this.mode === 'active') {
      if (next >= this.monitor.getActiveCharCount()) return null;
      this.charIndex = next;
      return this.monitor.getActiveCharAt(next);
    }
    if (next >= this.monitor.getCharCount()) return null;
    this.charIndex = next;
    return this.monitor.getCharAt(next);
  }

  previousChar() {
    if (this.charIndex <= 0) return null;
    this.charIndex--;
    if (this.mode === 'active') return this.monitor.getActiveCharAt(this.charIndex);
    return this.monitor.getCharAt(this.charIndex);
  }

  goToChar(index) {
    if (this.mode === 'active') {
      const clamped = Math.max(-1, Math.min(index, this.monitor.getActiveCharCount() - 1));
      this.charIndex = clamped;
      return this.monitor.getActiveCharAt(clamped);
    }
    const clamped = Math.max(-1, Math.min(index, this.monitor.getCharCount() - 1));
    this.charIndex = clamped;
    return this.monitor.getCharAt(clamped);
  }

  // Token navigation
  nextToken() {
    const next = this.tokenIndex + 1;
    if (this.mode === 'active') {
      if (next >= this.monitor.getActiveTokenCount()) return null;
      this.tokenIndex = next;
      return this.monitor.getActiveTokenAt(next);
    }
    if (next >= this.monitor.getTokenCount()) return null;
    this.tokenIndex = next;
    const token = this.monitor.getTokenAt(next);
    token.currentRect = token.alive
      ? this.monitor.getCurrentRect(token.currentStartPos, token.currentEndPos - token.currentStartPos)
      : null;
    this.keystrokeIndex = token.keystrokeIndex;
    this._emit('position', this.getCurrentState());
    return token;
  }

  previousToken() {
    if (this.tokenIndex <= 0) return null;
    this.tokenIndex--;
    if (this.mode === 'active') return this.monitor.getActiveTokenAt(this.tokenIndex);
    const token = this.monitor.getTokenAt(this.tokenIndex);
    this.keystrokeIndex = token.keystrokeIndex;
    this._emit('position', this.getCurrentState());
    return token;
  }

  goToToken(index) {
    if (this.mode === 'active') {
      const clamped = Math.max(-1, Math.min(index, this.monitor.getActiveTokenCount() - 1));
      this.tokenIndex = clamped;
      return this.monitor.getActiveTokenAt(clamped);
    }
    const clamped = Math.max(-1, Math.min(index, this.monitor.getTokenCount() - 1));
    this.tokenIndex = clamped;
    if (clamped >= 0) {
      const token = this.monitor.getTokenAt(clamped);
      this.keystrokeIndex = token.keystrokeIndex;
    } else {
      this.keystrokeIndex = -1;
    }
    this._emit('position', this.getCurrentState());
    return this.monitor.getTokenAt(clamped);
  }

  // Relative offset access (doesn't change position)
  getKeystrokeAtOffset(offset) {
    return this.monitor.getKeystrokeAt(this.keystrokeIndex + offset);
  }

  getTokenAtOffset(offset) {
    if (this.mode === 'active') return this.monitor.getActiveTokenAt(this.tokenIndex + offset);
    return this.monitor.getTokenAt(this.tokenIndex + offset);
  }

  getCharAtOffset(offset) {
    if (this.mode === 'active') return this.monitor.getActiveCharAt(this.charIndex + offset);
    return this.monitor.getCharAt(this.charIndex + offset);
  }

  // Peek at the live head with an offset (relative to latest event)
  getKeystrokeFromHead(offset) {
    return this.monitor.getKeystrokeAt(this.monitor.getKeystrokeCount() - 1 + offset);
  }

  getTokenFromHead(offset) {
    if (this.mode === 'active') return this.monitor.getActiveTokenAt(this.monitor.getActiveTokenCount() - 1 + offset);
    return this.monitor.getTokenAt(this.monitor.getTokenCount() - 1 + offset);
  }

  // Advances whichever of the next token or next char has the earlier timestamp.
  // Always uses recorded streams (ignores active mode) to ensure timestamps exist.
  // Each returned item has: rect (original), currentRect (live position or null), alive.
  next() {
    const nextToken = this.monitor.getTokenAt(this.tokenIndex + 1);
    const nextChar  = this.monitor.getCharAt(this.charIndex + 1);
    if (!nextToken && !nextChar) return null;
    const useToken = nextToken && (!nextChar || nextToken.timestamp <= nextChar.timestamp);
    if (useToken) {
      this.tokenIndex++;
      nextToken.currentRect = nextToken.alive
        ? this.monitor.getCurrentRect(nextToken.currentStartPos, nextToken.currentEndPos - nextToken.currentStartPos)
        : null;
      return { item: nextToken, type: 'token' };
    }
    this.charIndex++;
    nextChar.currentRect = nextChar.alive
      ? this.monitor.getCurrentRect(nextChar.currentPos)
      : null;
    return { item: { ...nextChar, index: this.charIndex }, type: 'char' };
  }

  _syncTokenIndex() {
    const tokens = this.monitor.tokens;
    let idx = -1;
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].keystrokeIndex <= this.keystrokeIndex) idx = i;
      else break;
    }
    this.tokenIndex = idx;
  }

  getCurrentState() {
    const event = this.monitor.getKeystrokeAt(this.keystrokeIndex);
    const token = this.monitor.getTokenAt(this.tokenIndex);
    return {
      keystrokeIndex: this.keystrokeIndex,
      tokenIndex: this.tokenIndex,
      charIndex: this.charIndex,
      keystroke: event,
      token,
      text: this.monitor.getTextAtKeystroke(this.keystrokeIndex),
      totalKeystrokes: this.monitor.getKeystrokeCount(),
      totalTokens: this.monitor.getTokenCount(),
      totalActiveTokens: this.monitor.getActiveTokenCount(),
      totalChars: this.monitor.getCharCount(),
      totalActiveChars: this.monitor.getActiveCharCount(),
    };
  }

  /**
   * Advances a stream on a timer, calling onItem for each result.
   *   stream:   'mixed' (default) | 'keystrokes' | 'tokens' | 'chars'
   *   interval: number (fixed ms) or 'timestamp' (use recorded deltas)
   *   loop:     reset to start when exhausted (default true)
   *   min/max:  clamp for timestamp-derived delays
   */
  play(onItem, { stream = 'mixed', loop = true, interval = 500, min = 4, max = 2000 } = {}) {
    this.pause();
    const fixedDelay = typeof interval === 'number' ? interval : 500;

    const advance = {
      mixed:      () => this.next(),
      keystrokes: () => this.nextKeystroke(),
      tokens:     () => this.nextToken(),
      chars:      () => this.nextChar(),
    }[stream];

    const resetFn = {
      mixed:      () => { this.goToToken(-1); this.goToChar(-1); },
      keystrokes: () => this.goToKeystroke(-1),
      tokens:     () => this.goToToken(-1),
      chars:      () => this.goToChar(-1),
    }[stream];

    const hasItems = {
      mixed:      () => this.monitor.getTokenCount() + this.monitor.getCharCount() > 0,
      keystrokes: () => this.monitor.getKeystrokeCount() > 0,
      tokens:     () => (this.mode === 'active' ? this.monitor.getActiveTokenCount() : this.monitor.getTokenCount()) > 0,
      chars:      () => (this.mode === 'active' ? this.monitor.getActiveCharCount() : this.monitor.getCharCount()) > 0,
    }[stream];

    const tick = () => {
      const result = advance();
      if (!result) {
        if (loop && hasItems()) resetFn();
        this._playTimer = setTimeout(tick, fixedDelay);
        return;
      }
      if (onItem) onItem(result);
      let delay = fixedDelay;
      if (interval === 'timestamp') {
        const currentTs = stream === 'mixed' ? result.item.timestamp : result.timestamp;
        let nextTs = null;
        if (stream === 'mixed') {
          const nt = this.getTokenAtOffset(1);
          const nc = this.getCharAtOffset(1);
          if (nt && nc) nextTs = Math.min(nt.timestamp, nc.timestamp);
          else nextTs = (nt || nc)?.timestamp ?? null;
        } else if (stream === 'keystrokes') {
          nextTs = this.getKeystrokeAtOffset(1)?.timestamp;
        } else if (stream === 'tokens') {
          nextTs = this.getTokenAtOffset(1)?.timestamp;
        } else {
          nextTs = this.getCharAtOffset(1)?.timestamp;
        }
        delay = nextTs != null ? nextTs - currentTs : fixedDelay;
        delay = Math.max(min, Math.min(delay, max));
      }
      this._playTimer = setTimeout(tick, delay);
    };

    this._emit('play');
    this._playTimer = setTimeout(tick, fixedDelay);
  }

  pause() {
    if (this._playTimer) {
      clearTimeout(this._playTimer);
      this._playTimer = null;
      this._emit('pause');
    }
  }

  reset() {
    this.pause();
    this.keystrokeIndex = -1;
    this.tokenIndex = -1;
    this.charIndex = -1;
    this._emit('position', this.getCurrentState());
  }

  destroy() {
    this.pause();
    this._listeners = {};
  }
}
