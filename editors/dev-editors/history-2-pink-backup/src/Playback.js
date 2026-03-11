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
  next() {
    const nextToken = this.monitor.getTokenAt(this.tokenIndex + 1);
    const nextChar  = this.monitor.getCharAt(this.charIndex + 1);
    if (!nextToken && !nextChar) return null;
    const useToken = nextToken && (!nextChar || nextToken.timestamp <= nextChar.timestamp);
    if (useToken) { this.tokenIndex++; return { item: nextToken, type: 'token' }; }
    this.charIndex++;
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

  // Temporal playback
  play(speed = 1.0) {
    this.pause();
    const advance = () => {
      const current = this.nextKeystroke();
      if (!current) { this.pause(); this._emit('done'); return; }
      const next = this.monitor.getKeystrokeAt(this.keystrokeIndex + 1);
      if (!next) { this._emit('done'); return; }
      const delay = (next.timestamp - current.timestamp) / speed;
      this._playTimer = setTimeout(advance, delay);
    };
    this._emit('play');
    advance();
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

  /**
   * Repeatedly advances a playback's keystroke stream, calling onKeystroke for each.
   * interval: number (fixed ms between calls) or 'timestamp' (use recorded timestamp deltas).
   * loop: if true, resets to start when the stream is exhausted.
   */
  static iterateKeystrokes(playback, onKeystroke, { loop = true, interval = 500, min=10, max=2000} = {}) {
    const fixedDelay = typeof interval === 'number' ? interval : 500;

    const tick = () => {
      const event = playback.nextKeystroke();
      if (!event) {
        if (loop && playback.monitor.getKeystrokeCount() > 0) playback.goToKeystroke(-1);
        setTimeout(tick, fixedDelay);
        return;
      }
      onKeystroke(event);
      let delay = fixedDelay;
      if (interval === 'timestamp') {
        const next = playback.getKeystrokeAtOffset(1);
        delay = next ? Math.min(next.timestamp - event.timestamp, max) : min;
      }
      setTimeout(tick, delay);
    };

    setTimeout(tick, fixedDelay);
  }

  /**
   * Repeatedly advances a playback's token stream, calling onToken for each.
   * interval: number (fixed ms between calls) or 'timestamp' (use recorded token timestamp deltas).
   * loop: if true, resets to start when the stream is exhausted.
   */
  static iterateTokens(playback, onToken, { loop = true, interval = 500 } = {}) {
    const getCount = () => playback.mode === 'active'
      ? playback.monitor.getActiveTokenCount()
      : playback.monitor.getTokenCount();

    const fixedDelay = typeof interval === 'number' ? interval : 500;

    const tick = () => {
      const token = playback.nextToken();
      if (!token) {
        if (loop && getCount() > 0) playback.goToToken(-1);
        setTimeout(tick, fixedDelay);
        return;
      }
      onToken(token);
      let delay = fixedDelay;
      if (interval === 'timestamp') {
        const next = playback.getTokenAtOffset(1);
        delay = next ? next.timestamp - token.timestamp : 500;
      }
      setTimeout(tick, delay);
    };

    setTimeout(tick, fixedDelay);
  }

  /**
   * Repeatedly calls playback.next() (interleaved chars+tokens by timestamp),
   * calling onItem({ item, type }) for each.
   */
  static iterate(playback, onItem, { loop = true, interval = 500, min=4, max=2000} = {}) {
    const getCount = () => {
      const tokens = playback.mode === 'active'
        ? playback.monitor.getActiveTokenCount()
        : playback.monitor.getTokenCount();
      const chars = playback.mode === 'active'
        ? playback.monitor.getActiveCharCount()
        : playback.monitor.getCharCount();
      return tokens + chars;
    };

    const fixedDelay = typeof interval === 'number' ? interval : 500;

    const tick = () => {
      const result = playback.next();
      if (!result) {
        if (loop && getCount() > 0) {
          playback.goToToken(-1);
          playback.goToChar(-1);
        }
        setTimeout(tick, fixedDelay);
        return;
      }
      onItem(result);
      let delay = fixedDelay;
      if (interval === 'timestamp') {
        const nextToken = playback.getTokenAtOffset(1);
        const nextChar = playback.getCharAtOffset(1);
        const currentTs = result.item.timestamp;
        let nextTs = null;
        if (nextToken && nextChar) nextTs = Math.min(nextToken.timestamp, nextChar.timestamp);
        else if (nextToken) nextTs = nextToken.timestamp;
        else if (nextChar) nextTs = nextChar.timestamp;
        delay = nextTs != null ? nextTs - currentTs : fixedDelay;
        delay = Math.max(min, Math.min(delay, max));
      }
      setTimeout(tick, delay);
    };

    setTimeout(tick, fixedDelay);
  }
}
