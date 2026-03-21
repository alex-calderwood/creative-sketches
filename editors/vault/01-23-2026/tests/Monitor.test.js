import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Monitor } from '../src/monitor/Monitor.js';

/**
 * Monitor is deeply coupled to contenteditable + Selection/Range APIs,
 * which jsdom doesn't fully support. We test:
 *   1. Pure logic methods directly (_diffTexts, _tokenize, _isTokenBoundary, _validateTokens)
 *   2. Provenance query layer via import() with known session data
 *   3. Import/export round-trip
 *   4. Emitter integration
 */

function makeEditor() {
  const el = document.createElement('div');
  el.setAttribute('contenteditable', 'true');
  document.body.appendChild(el);
  return el;
}

function makeSessionData() {
  return {
    startTime: 1000,
    events: [
      { type: 'insert', data: 'hello ', cursorBefore: 0, cursorAfter: 6, timestamp: 1001, index: 0, textSnapshot: 'hello ' },
      { type: 'insert', data: 'world', cursorBefore: 6, cursorAfter: 11, timestamp: 1002, index: 1, textSnapshot: 'hello world' },
    ],
    tokens: [
      { text: 'hello', startPos: 0, endPos: 5, active: true, tokenIndex: 0, keystrokeIndex: 0, timestamp: 1001, charIndices: [0, 1, 2, 3, 4] },
    ],
    chars: [
      { ch: 'h', timestamp: 1001, keystrokeIndex: 0, originalPos: 0 },
      { ch: 'e', timestamp: 1001, keystrokeIndex: 0, originalPos: 1 },
      { ch: 'l', timestamp: 1001, keystrokeIndex: 0, originalPos: 2 },
      { ch: 'l', timestamp: 1001, keystrokeIndex: 0, originalPos: 3 },
      { ch: 'o', timestamp: 1001, keystrokeIndex: 0, originalPos: 4 },
      { ch: ' ', timestamp: 1001, keystrokeIndex: 0, originalPos: 5 },
      { ch: 'w', timestamp: 1002, keystrokeIndex: 1, originalPos: 6 },
      { ch: 'o', timestamp: 1002, keystrokeIndex: 1, originalPos: 7 },
      { ch: 'r', timestamp: 1002, keystrokeIndex: 1, originalPos: 8 },
      { ch: 'l', timestamp: 1002, keystrokeIndex: 1, originalPos: 9 },
      { ch: 'd', timestamp: 1002, keystrokeIndex: 1, originalPos: 10 },
    ],
    charIds: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  };
}

describe('Monitor — pure logic', () => {
  let monitor;
  let el;

  beforeEach(() => {
    el = makeEditor();
    monitor = new Monitor(el);
  });

  describe('_diffTexts', () => {
    it('detects insertion', () => {
      const d = monitor._diffTexts('abc', 'abXc');
      expect(d.oldFrom).toBe(2);
      expect(d.oldTo).toBe(2);
      expect(d.newFrom).toBe(2);
      expect(d.newTo).toBe(3);
    });

    it('detects deletion', () => {
      const d = monitor._diffTexts('abcd', 'abd');
      expect(d.oldFrom).toBe(2);
      expect(d.oldTo).toBe(3);
      expect(d.newFrom).toBe(2);
      expect(d.newTo).toBe(2);
    });

    it('detects replacement', () => {
      const d = monitor._diffTexts('hello', 'hXllo');
      expect(d.oldFrom).toBe(1);
      expect(d.oldTo).toBe(2);
      expect(d.newFrom).toBe(1);
      expect(d.newTo).toBe(2);
    });

    it('handles identical strings', () => {
      const d = monitor._diffTexts('same', 'same');
      expect(d.oldFrom).toBe(d.oldTo);
      expect(d.newFrom).toBe(d.newTo);
    });

    it('handles empty to non-empty', () => {
      const d = monitor._diffTexts('', 'abc');
      expect(d.newFrom).toBe(0);
      expect(d.newTo).toBe(3);
    });
  });

  describe('_tokenize', () => {
    it('splits on whitespace', () => {
      expect(monitor._tokenize('the cat sat')).toEqual(['the', 'cat', 'sat']);
    });

    it('filters empty strings', () => {
      expect(monitor._tokenize('  a  b  ')).toEqual(['a', 'b']);
    });

    it('returns empty array for whitespace-only input', () => {
      expect(monitor._tokenize('   ')).toEqual([]);
    });
  });

  describe('_isTokenBoundary', () => {
    it('returns true for space', () => {
      expect(monitor._isTokenBoundary(' ')).toBe(true);
    });

    it('returns true for newline', () => {
      expect(monitor._isTokenBoundary('\n')).toBe(true);
    });

    it('returns false for letters', () => {
      expect(monitor._isTokenBoundary('a')).toBe(false);
    });
  });

  describe('_validateTokens', () => {
    it('marks tokens active if text matches at position', () => {
      monitor.text = 'hello world';
      monitor.tokens = [
        { text: 'hello', startPos: 0, endPos: 5, active: false },
        { text: 'world', startPos: 6, endPos: 11, active: false },
      ];
      monitor._validateTokens();
      expect(monitor.tokens[0].active).toBe(true);
      expect(monitor.tokens[1].active).toBe(true);
      expect(monitor.activeTokens).toHaveLength(2);
    });

    it('marks tokens inactive if text has changed at position', () => {
      monitor.text = 'xxxxx world';
      monitor.tokens = [
        { text: 'hello', startPos: 0, endPos: 5, active: true },
        { text: 'world', startPos: 6, endPos: 11, active: true },
      ];
      monitor._validateTokens();
      expect(monitor.tokens[0].active).toBe(false);
      expect(monitor.tokens[1].active).toBe(true);
      expect(monitor.activeTokens).toHaveLength(1);
    });
  });
});

describe('Monitor — import / export / queries', () => {
  let monitor;
  let el;

  beforeEach(() => {
    el = makeEditor();
    monitor = new Monitor(el);
    monitor.import(makeSessionData());
  });

  describe('import', () => {
    it('restores events', () => {
      expect(monitor.events).toHaveLength(2);
    });

    it('restores text from last snapshot', () => {
      expect(monitor.text).toBe('hello world');
    });

    it('restores tokens and marks active ones', () => {
      expect(monitor.tokens).toHaveLength(1);
      expect(monitor.activeTokens).toHaveLength(1);
    });

    it('restores chars and charIds', () => {
      expect(monitor.chars).toHaveLength(11);
      expect(monitor.charIds).toHaveLength(11);
    });
  });

  describe('export', () => {
    it('round-trips with import', () => {
      const exported = monitor.export();
      const monitor2 = new Monitor(makeEditor());
      monitor2.import(exported);

      expect(monitor2.text).toBe('hello world');
      expect(monitor2.events).toHaveLength(2);
      expect(monitor2.chars).toHaveLength(11);
    });
  });

  describe('count accessors', () => {
    it('getKeystrokeCount', () => expect(monitor.getKeystrokeCount()).toBe(2));
    it('getTokenCount', () => expect(monitor.getTokenCount()).toBe(1));
    it('getActiveTokenCount', () => expect(monitor.getActiveTokenCount()).toBe(1));
    it('getCharCount', () => expect(monitor.getCharCount()).toBe(11));
    it('getActiveCharCount', () => expect(monitor.getActiveCharCount()).toBe(11));
    it('getDuration', () => expect(monitor.getDuration()).toBe(1));
  });

  describe('provenance queries', () => {
    it('getCharCurrentPos finds char in charIds', () => {
      expect(monitor.getCharCurrentPos(0)).toBe(0);
      expect(monitor.getCharCurrentPos(6)).toBe(6);
    });

    it('getCharCurrentPos returns -1 for missing char', () => {
      expect(monitor.getCharCurrentPos(999)).toBe(-1);
    });

    it('getCharOriginAt returns the char entry at a doc position', () => {
      const origin = monitor.getCharOriginAt(0);
      expect(origin.ch).toBe('h');
      expect(origin.timestamp).toBe(1001);
    });

    it('getCharOriginAt returns null for out-of-bounds', () => {
      expect(monitor.getCharOriginAt(-1)).toBeNull();
      expect(monitor.getCharOriginAt(100)).toBeNull();
    });

    it('getTokenCurrentPos returns start/end from charIds', () => {
      const pos = monitor.getTokenCurrentPos(monitor.tokens[0]);
      expect(pos).toEqual({ startPos: 0, endPos: 5 });
    });

    it('getTokenCurrentPos returns null for token with no charIndices', () => {
      expect(monitor.getTokenCurrentPos({ charIndices: [] })).toBeNull();
    });
  });

  describe('enriched accessors', () => {
    it('getKeystrokeAt returns the event', () => {
      const e = monitor.getKeystrokeAt(0);
      expect(e.type).toBe('insert');
      expect(e.data).toBe('hello ');
    });

    it('getKeystrokeAt returns null for bad index', () => {
      expect(monitor.getKeystrokeAt(99)).toBeNull();
    });

    it('getTokenAt includes current position data', () => {
      const t = monitor.getTokenAt(0);
      expect(t.text).toBe('hello');
      expect(t.currentStartPos).toBe(0);
      expect(t.currentEndPos).toBe(5);
      expect(t.alive).toBe(true);
    });

    it('getCharAt includes current position', () => {
      const c = monitor.getCharAt(0);
      expect(c.ch).toBe('h');
      expect(c.currentPos).toBe(0);
      expect(c.alive).toBe(true);
    });

    it('getActiveCharAt returns doc position info', () => {
      const c = monitor.getActiveCharAt(6);
      expect(c.ch).toBe('w');
      expect(c.docPos).toBe(6);
    });
  });

  describe('getTextAtKeystroke', () => {
    it('returns the snapshot at a given keystroke', () => {
      expect(monitor.getTextAtKeystroke(0)).toBe('hello ');
      expect(monitor.getTextAtKeystroke(1)).toBe('hello world');
    });

    it('returns empty string for out-of-bounds', () => {
      expect(monitor.getTextAtKeystroke(-1)).toBe('');
      expect(monitor.getTextAtKeystroke(99)).toBe('');
    });
  });
});

describe('Monitor — emitter integration', () => {
  it('emits token events via _detectTokens', () => {
    const el = makeEditor();
    const monitor = new Monitor(el);
    const tokenFn = vi.fn();
    monitor.on('token', tokenFn);

    // Set up state: user typed "test " with cursor starting at 0
    monitor.text = 'test ';
    monitor.charIds = Array.from({ length: 5 }, (_, i) => i);
    monitor.chars = [...'test '].map((ch, i) => ({
      ch, timestamp: 1000, keystrokeIndex: 0, originalPos: i,
    }));
    monitor.events = [{
      type: 'insert', data: 'test ', cursorBefore: 0, cursorAfter: 5,
      timestamp: 1000, index: 0, textSnapshot: 'test ',
    }];

    monitor._detectTokens();
    expect(tokenFn).toHaveBeenCalledOnce();
    expect(tokenFn.mock.calls[0][0].text).toBe('test');
  });
});

describe('Monitor — destroy', () => {
  it('removes event listeners from the element', () => {
    const el = makeEditor();
    const spy = vi.spyOn(el, 'removeEventListener');
    const monitor = new Monitor(el);
    monitor.destroy();
    expect(spy).toHaveBeenCalledWith('beforeinput', expect.any(Function));
    expect(spy).toHaveBeenCalledWith('input', expect.any(Function));
  });
});
