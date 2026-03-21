import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TextStream } from '../src/streams/TextStream.js';
import { Token } from '../src/corpus/Token.js';

function makeMockReader(words) {
  let index = 0;
  return {
    read() {
      const text = words[index % words.length];
      index++;
      return new Token({ text, type: 'word', source: 'mock' });
    },
  };
}

describe('TextStream', () => {
  let stream;
  let reader;

  beforeEach(() => {
    reader = makeMockReader(['the', 'quick', 'brown', 'fox', 'jumps']);
    stream = new TextStream(3, reader);
  });

  it('fills to the specified size on construction', () => {
    expect(stream.getStream()).toHaveLength(3);
    expect(stream.getStream().map(t => t.text)).toEqual(['the', 'quick', 'brown']);
  });

  it('getToken returns the token at an index', () => {
    expect(stream.getToken(0).text).toBe('the');
    expect(stream.getToken(2).text).toBe('brown');
  });

  it('getToken throws on out-of-bounds index', () => {
    expect(() => stream.getToken(-1)).toThrow('Index out of bounds');
    expect(() => stream.getToken(3)).toThrow('Index out of bounds');
  });

  it('pop removes the first token and refills', () => {
    const popped = stream.pop();
    expect(popped.text).toBe('the');
    expect(stream.getStream()).toHaveLength(3);
    expect(stream.getStream().map(t => t.text)).toEqual(['quick', 'brown', 'fox']);
  });

  it('pop returns null on empty stream', () => {
    stream.tokens = [];
    stream.size = 0;
    expect(stream.pop()).toBeNull();
  });

  it('setToken replaces a token and emits token-change', () => {
    const replacement = new Token({ text: 'red', source: 'test' });
    stream.setToken(1, replacement);
    expect(stream.getToken(1).text).toBe('red');
  });

  it('setToken throws on out-of-bounds index', () => {
    expect(() => stream.setToken(5, {})).toThrow('Index out of bounds');
  });

  it('updateReader uses the new reader for subsequent fills', () => {
    const newReader = makeMockReader(['alpha', 'beta']);
    stream.tokens = [];
    stream.updateReader(newReader);
    expect(stream.getStream().map(t => t.text)).toEqual(['alpha', 'beta', 'alpha']);
  });
});
