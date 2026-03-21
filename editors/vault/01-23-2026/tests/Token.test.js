import { describe, it, expect } from 'vitest';
import { Token, uuid } from '../src/corpus/Token.js';

describe('uuid', () => {
  it('starts with the given prefix', () => {
    expect(uuid('tok-')).toMatch(/^tok-/);
  });

  it('generates unique values', () => {
    const ids = new Set(Array.from({ length: 100 }, () => uuid('x-')));
    expect(ids.size).toBe(100);
  });
});

describe('Token', () => {
  it('sets all fields from constructor data', () => {
    const t = new Token({ text: 'hello', pos: 'Noun', source: 'test', type: 'word' });
    expect(t.text).toBe('hello');
    expect(t.pos).toBe('Noun');
    expect(t.source).toBe('test');
    expect(t.type).toBe('word');
    expect(t.id).toMatch(/^token-/);
  });

  it('uses defaults for optional fields', () => {
    const t = new Token({ text: 'a' });
    expect(t.term).toBeNull();
    expect(t.idx).toBeNull();
    expect(t.type).toBe('word');
  });

  it('preserves a provided id', () => {
    const t = new Token({ text: 'x', id: 'custom-id' });
    expect(t.id).toBe('custom-id');
  });

  describe('toJSON', () => {
    it('returns own non-function properties', () => {
      const t = new Token({ text: 'hi', pos: 'Verb', source: 's' });
      const json = t.toJSON();
      expect(json.text).toBe('hi');
      expect(json.pos).toBe('Verb');
      expect(json.hasOwnProperty('toString')).toBe(false);
    });
  });

  describe('fromToken', () => {
    it('copies text and properties but assigns a new id', () => {
      const original = new Token({ text: 'word', pos: 'Noun', source: 'a' });
      const copy = Token.fromToken(original);
      expect(copy.text).toBe('word');
      expect(copy.pos).toBe('Noun');
      expect(copy.id).not.toBe(original.id);
    });

    it('throws on null input', () => {
      expect(() => Token.fromToken(null)).toThrow();
    });
  });

  describe('toString', () => {
    it('returns a readable representation', () => {
      const t = new Token({ text: 'run', pos: 'Verb', source: 'test', type: 'word' });
      expect(t.toString()).toBe('Token(text: run, type: word, pos: Verb, source: test)');
    });
  });
});
