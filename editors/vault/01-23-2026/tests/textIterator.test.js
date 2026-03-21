import { describe, it, expect } from 'vitest';
import {
  getTextNodeAtOffset,
  getGlobalTextOffset,
  getEditableText,
  newWords,
} from '../src/document/textIterator.js';

function makeEditable(html) {
  const el = document.createElement('div');
  el.setAttribute('contenteditable', 'true');
  el.innerHTML = html;
  document.body.appendChild(el);
  return el;
}

describe('getEditableText', () => {
  it('returns plain text from a simple text node', () => {
    const el = makeEditable('hello world');
    expect(getEditableText(el)).toBe('hello world');
  });

  it('inserts newline for block elements', () => {
    const el = makeEditable('<p>line one</p><p>line two</p>');
    expect(getEditableText(el)).toBe('line one\nline two');
  });

  it('handles BR tags as newlines', () => {
    const el = makeEditable('first<br>second');
    expect(getEditableText(el)).toBe('first\nsecond');
  });

  it('returns empty string for empty element', () => {
    const el = makeEditable('');
    expect(getEditableText(el)).toBe('');
  });

  it('handles nested inline elements', () => {
    const el = makeEditable('hello <b>bold</b> world');
    expect(getEditableText(el)).toBe('hello bold world');
  });

  it('handles multiple nested block elements', () => {
    const el = makeEditable('<div><p>a</p><p>b</p></div><div>c</div>');
    expect(getEditableText(el)).toBe('a\nb\nc');
  });
});

describe('getTextNodeAtOffset', () => {
  it('finds the text node for a simple offset', () => {
    const el = makeEditable('hello');
    const result = getTextNodeAtOffset(el, 3);
    expect(result.node.nodeValue).toBe('hello');
    expect(result.offset).toBe(3);
  });

  it('finds the correct node across multiple text nodes', () => {
    const el = makeEditable('<span>abc</span><span>def</span>');
    const result = getTextNodeAtOffset(el, 4);
    expect(result.node.nodeValue).toBe('def');
    expect(result.offset).toBe(1);
  });

  it('accounts for block-element newlines in offset', () => {
    const el = makeEditable('<p>ab</p><p>cd</p>');
    // text is "ab\ncd", offset 4 = 'c' in second p + 1 for newline
    const result = getTextNodeAtOffset(el, 4);
    expect(result.node.nodeValue).toBe('cd');
    expect(result.offset).toBe(1);
  });

  it('returns null when offset exceeds text length', () => {
    const el = makeEditable('hi');
    const result = getTextNodeAtOffset(el, 100);
    expect(result).toBeNull();
  });
});

describe('getGlobalTextOffset', () => {
  it('returns 0 for the start of the first text node', () => {
    const el = makeEditable('hello');
    const textNode = el.childNodes[0];
    expect(getGlobalTextOffset(el, textNode, 0)).toBe(0);
  });

  it('returns correct offset within a single text node', () => {
    const el = makeEditable('hello');
    const textNode = el.childNodes[0];
    expect(getGlobalTextOffset(el, textNode, 3)).toBe(3);
  });

  it('returns correct offset across multiple spans', () => {
    const el = makeEditable('<span>abc</span><span>def</span>');
    const secondTextNode = el.querySelector('span:nth-child(2)').childNodes[0];
    expect(getGlobalTextOffset(el, secondTextNode, 1)).toBe(4); // 3 + 1
  });

  it('accounts for block boundaries', () => {
    const el = makeEditable('<p>ab</p><p>cd</p>');
    const secondP = el.querySelector('p:nth-child(2)');
    const textNode = secondP.childNodes[0];
    // "ab" (2) + newline (1) + offset 1 = 4
    expect(getGlobalTextOffset(el, textNode, 1)).toBe(4);
  });
});

describe('getTextNodeAtOffset / getGlobalTextOffset roundtrip', () => {
  it('roundtrips correctly on multi-block content', () => {
    const el = makeEditable('<p>hello</p><p>world</p>');
    // text is "hello\nworld", test offsets 0-10
    const text = getEditableText(el);
    for (let i = 0; i < text.length; i++) {
      const found = getTextNodeAtOffset(el, i);
      if (found) {
        const back = getGlobalTextOffset(el, found.node, found.offset);
        expect(back).toBe(i);
      }
    }
  });
});

describe('newWords', () => {
  it('returns all current words when previous is null', () => {
    const current = [{ text: 'a', startIndex: 0, endIndex: 1 }];
    expect(newWords(null, current)).toEqual(current);
  });

  it('returns empty when current is null', () => {
    expect(newWords([{ text: 'a', startIndex: 0, endIndex: 1 }], null)).toEqual([]);
  });

  it('returns only words not in previous', () => {
    const prev = [
      { text: 'hello', startIndex: 0, endIndex: 5 },
    ];
    const curr = [
      { text: 'hello', startIndex: 0, endIndex: 5 },
      { text: 'world', startIndex: 6, endIndex: 11 },
    ];
    const result = newWords(prev, curr);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('world');
  });

  it('returns empty when sets are identical', () => {
    const words = [{ text: 'a', startIndex: 0, endIndex: 1 }];
    expect(newWords(words, words)).toEqual([]);
  });
});
