import { describe, it, expect, vi } from 'vitest';
import { Reader } from '../src/readers/Reader.js';
import { TextReader } from '../src/readers/TextReader.js';
import { RepeatingReader } from '../src/readers/RepeatingReader.js';
import { MultiTextReader } from '../src/readers/MultiTextReader.js';
import { TextCorpus } from '../src/corpus/TextCorpus.js';
import { Token } from '../src/corpus/Token.js';

function makeCorpus(words, source = 'test') {
  const corpus = new TextCorpus(source);
  corpus.tokens = words.map(w => new Token({ text: w, pos: 'Noun', source }));
  corpus.text = words.join(' ');
  return corpus;
}

describe('Reader (base)', () => {
  it('read() calls currentToken then updateState', () => {
    const r = new Reader();
    const token = { text: 'hi' };
    r.currentToken = vi.fn(() => token);
    r.updateState = vi.fn();

    const result = r.read();
    expect(result).toBe(token);
    expect(r.currentToken).toHaveBeenCalledBefore(r.updateState);
  });

  it('currentToken throws by default', () => {
    expect(() => new Reader().currentToken()).toThrow();
  });

  it('updateState throws by default', () => {
    expect(() => new Reader().updateState()).toThrow();
  });
});

describe('TextReader', () => {
  it('rejects non-TextCorpus argument', () => {
    expect(() => new TextReader({})).toThrow('corpus must be an instance of TextCorpus');
  });

  it('reads tokens sequentially from the corpus', () => {
    const corpus = makeCorpus(['the', 'cat', 'sat']);
    const reader = new TextReader(corpus);

    expect(reader.read().text).toBe('the');
    expect(reader.read().text).toBe('cat');
    expect(reader.read().text).toBe('sat');
  });

  it('wraps around to the beginning after reaching the end', () => {
    const corpus = makeCorpus(['a', 'b']);
    const reader = new TextReader(corpus);

    reader.read(); // a
    reader.read(); // b
    expect(reader.read().text).toBe('a');
  });

  it('returns new Token instances (not the same reference)', () => {
    const corpus = makeCorpus(['word']);
    const reader = new TextReader(corpus);
    const t1 = reader.read();
    const t2 = reader.read();
    expect(t1.id).not.toBe(t2.id);
  });

  it('clone() produces an independent reader', () => {
    const corpus = makeCorpus(['x', 'y', 'z']);
    const reader = new TextReader(corpus);
    reader.read(); // advance to index 1

    const clone = reader.clone();
    // clone starts fresh at 0
    expect(clone.read().text).toBe('x');
    // original is still at index 1
    expect(reader.read().text).toBe('y');
  });
});

describe('RepeatingReader', () => {
  it('returns the same word repeatedly (cycle off)', () => {
    const reader = new RepeatingReader('echo', { cycle: false });
    expect(reader.read().text).toBe('echo');
    expect(reader.read().text).toBe('echo');
    expect(reader.read().text).toBe('echo');
  });

  it('cycles through history when words are updated', () => {
    const reader = new RepeatingReader('a');
    reader.updateWord('b');
    reader.updateWord('c');

    // history is [a, b, c], cycles through
    const words = Array.from({ length: 6 }, () => reader.read().text);
    expect(words).toEqual(['a', 'b', 'c', 'a', 'b', 'c']);
  });

  it('returns Token instances', () => {
    const reader = new RepeatingReader('hi');
    const t = reader.read();
    expect(t).toBeInstanceOf(Token);
    expect(t.type).toBe('word');
  });

  it('clone() is independent', () => {
    const reader = new RepeatingReader('x');
    reader.updateWord('y');
    const clone = reader.clone();
    // clone gets this.word ('y') but fresh history
    expect(clone.read().text).toBe('y');
    // original still cycles through its full history
    expect(reader.read().text).toBe('x');
  });
});

describe('MultiTextReader', () => {
  it('rejects non-array or empty input', () => {
    expect(() => new MultiTextReader([])).toThrow();
    expect(() => new MultiTextReader([{}])).toThrow();
  });

  it('interleaves tokens from multiple corpora', () => {
    const c1 = makeCorpus(['a', 'b'], 'src1');
    const c2 = makeCorpus(['x', 'y'], 'src2');
    const reader = new MultiTextReader([c1, c2]);

    // read() calls currentToken() then updateState().
    // updateState advances corpusIndex first, then advances the NEW corpus's token index.
    // read 1: c1[0]='a', then advance to c2, advance c2 index 0→1
    // read 2: c2[1]='y', then advance to c1, advance c1 index 0→1
    // read 3: c1[1]='b', then advance to c2, advance c2 index 1→0
    // read 4: c2[0]='x', then advance to c1, advance c1 index 1→0
    const words = Array.from({ length: 4 }, () => reader.read().text);
    expect(words).toEqual(['a', 'y', 'b', 'x']);
  });

  it('wraps each corpus independently', () => {
    const c1 = makeCorpus(['only'], 'short');
    const c2 = makeCorpus(['p', 'q', 'r'], 'long');
    const reader = new MultiTextReader([c1, c2]);

    const words = Array.from({ length: 6 }, () => reader.read().text);
    expect(words).toEqual(['only', 'q', 'only', 'r', 'only', 'p']);
  });

  it('clone() produces an independent reader', () => {
    const c1 = makeCorpus(['a', 'b'], 'src1');
    const c2 = makeCorpus(['x', 'y'], 'src2');
    const reader = new MultiTextReader([c1, c2]);
    reader.read(); // 'a', then advances to c2, advances c2 0→1

    const clone = reader.clone();
    // clone starts fresh at corpus 0 index 0
    expect(clone.read().text).toBe('a');
    // original is at corpus 1 after the first read
    expect(reader.read().text).toBe('y');
  });
});
