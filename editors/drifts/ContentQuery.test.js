import { describe, it, expect, beforeEach } from 'vitest';
import { GameplaySave } from './GameplaySave.js';
import { Document } from './Document.js';
import { getText, putText, joinText } from './ContentQuery.js';

// --- fixtures --------------------------------------------------------------
// A "Recycling" drift: progression 1 -> playing -> 3, with chosen docs for
// the first two levels and an extra draft on level "1".

const PROGRESSION = ['1', 'playing', '3'];

function makeDoc(id, { drift = 'Recycling', level, text, edits } = {}) {
  const data = {
    driftName: drift,
    levelId: level,
    sourceEditor: 'test',
    title: id,
    content: JSON.stringify({ text }),
  };
  if (edits) data.edits = edits;
  return new Document(id, data);
}

function makeSave() {
  const save = new GameplaySave();
  save.setMetadata('selectedDrift', 'Recycling');
  save.addDocument(makeDoc('doc_1a', { level: '1', text: 'first draft of waste' }));
  save.addDocument(makeDoc('doc_1b', { level: '1', text: 'chosen waste page' }));
  save.addDocument(makeDoc('doc_play', {
    level: 'playing',
    text: 'a poem made of waste',
    edits: [{ text: 'wsate' }, { text: 'recyle' }],
  }));
  save.setMetadata('chosenDocuments', { '1': 'doc_1b', playing: 'doc_play' });
  return save;
}

const ctx = { driftName: 'Recycling', progression: PROGRESSION };

describe('getText — return shape', () => {
  it('always returns an array of {name, text}', async () => {
    const out = await getText(makeSave(), { scope: 'document', target: 'doc_1b' }, ctx);
    expect(Array.isArray(out)).toBe(true);
    expect(out[0]).toMatchObject({ name: 'content', text: 'chosen waste page' });
  });

  it('passes a bare string through as a literal', async () => {
    expect(await getText(null, 'hello', ctx)).toEqual([{ name: 'literal', text: 'hello' }]);
  });
});

describe('getText — content scopes', () => {
  it('document scope returns one doc', async () => {
    const out = await getText(makeSave(), { scope: 'document', target: 'doc_play' }, ctx);
    expect(out.map((e) => e.text)).toEqual(['a poem made of waste']);
  });

  it('level/chosen returns the chosen doc only', async () => {
    const out = await getText(makeSave(), { scope: 'level', target: '1', filter: 'chosen' }, ctx);
    expect(out.map((e) => e.text)).toEqual(['chosen waste page']);
  });

  it('level/all returns every draft for that level', async () => {
    const out = await getText(makeSave(), { scope: 'level', target: '1', filter: 'all' }, ctx);
    expect(out.map((e) => e.text).sort()).toEqual(['chosen waste page', 'first draft of waste']);
  });

  it('drift/all returns every doc in the drift', async () => {
    const out = await getText(makeSave(), { scope: 'drift', filter: 'all' }, ctx);
    expect(out).toHaveLength(3);
  });

  it('drift/chosen returns chosen docs in progression order', async () => {
    const out = await getText(makeSave(), { scope: 'drift', filter: 'chosen' }, ctx);
    expect(out.map((e) => e.text)).toEqual(['chosen waste page', 'a poem made of waste']);
  });

  it('drift/previous returns chosen docs of earlier levels only', async () => {
    const out = await getText(
      makeSave(),
      { scope: 'drift', filter: 'previous' },
      { ...ctx, levelId: 'playing' },
    );
    expect(out.map((e) => e.text)).toEqual(['chosen waste page']);
  });
});

describe('getText — editor scope (drift-independent)', () => {
  it('returns every document produced by an editor, across drifts', async () => {
    const save = makeSave();
    // a standalone doc in a different drift, same editor
    const other = makeDoc('doc_other', { drift: 'Sandbox', level: null, text: 'standalone' });
    other.setField('sourceEditor', 'poetris-drift');
    save.addDocument(other);
    save.getDocument('doc_play').setField('sourceEditor', 'poetris-drift');

    const out = await getText(save, { scope: 'editor', target: 'poetris-drift' }, {});
    expect(out.map((e) => e.text).sort()).toEqual(['a poem made of waste', 'standalone']);
  });
});

describe('getText — edits type', () => {
  it('reads edits from a document', async () => {
    const out = await getText(makeSave(), { type: 'edits', scope: 'document', target: 'doc_play' }, ctx);
    expect(out.map((e) => e.text)).toEqual(['wsate', 'recyle']);
    expect(out.every((e) => e.name === 'edit')).toBe(true);
  });

  it('aggregates edits across the whole drift (the old getEdits use case)', async () => {
    const out = await getText(makeSave(), { type: 'edits', scope: 'drift', filter: 'all' }, ctx);
    expect(out.map((e) => e.text)).toEqual(['wsate', 'recyle']);
  });
});

describe('getText — fallback', () => {
  it('falls back to a literal string when nothing resolves', async () => {
    const out = await getText(makeSave(), {
      scope: 'level', target: 'never-played', filter: 'chosen',
      fallback: 'default seed text',
    }, ctx);
    expect(out).toEqual([{ name: 'fallback', text: 'default seed text' }]);
  });

  it('chains fallbacks: query -> query -> literal', async () => {
    const out = await getText(makeSave(), {
      scope: 'level', target: 'missing-a', filter: 'chosen',
      fallback: {
        scope: 'level', target: 'missing-b', filter: 'chosen',
        fallback: 'final fallback',
      },
    }, ctx);
    expect(out).toEqual([{ name: 'fallback', text: 'final fallback' }]);
  });

  it('resolves a {kind:"file"} fallback via injected loader', async () => {
    const fileLoader = async (path) => `loaded:${path}`;
    const out = await getText(makeSave(), {
      scope: 'level', target: 'never', filter: 'chosen',
      fallback: { kind: 'file', path: 'corpora/x.txt' },
    }, { ...ctx, fileLoader });
    expect(out).toEqual([{ name: 'file', text: 'loaded:corpora/x.txt', path: 'corpora/x.txt' }]);
  });

  it('uses live data over the fallback when present', async () => {
    const out = await getText(makeSave(), {
      scope: 'level', target: '1', filter: 'chosen',
      fallback: 'should not appear',
    }, ctx);
    expect(out.map((e) => e.text)).toEqual(['chosen waste page']);
  });
});

describe('getText — sandbox (no save)', () => {
  it('short-circuits to the fallback when save is null', async () => {
    const out = await getText(null, {
      type: 'content', scope: 'drift', filter: 'all',
      fallback: { kind: 'file', path: 'sandbox-corpus.txt' },
    }, { fileLoader: async (p) => `sandbox:${p}` });
    expect(out).toEqual([{ name: 'file', text: 'sandbox:sandbox-corpus.txt', path: 'sandbox-corpus.txt' }]);
  });
});

describe('putText', () => {
  it('sets content text, preserving sibling fields like image', async () => {
    const save = makeSave();
    save.getDocument('doc_play').setContent({ text: 'old', image: 'img.png' });
    putText(save, { type: 'content', documentId: 'doc_play' }, 'new poem');
    const doc = save.getDocument('doc_play');
    expect(doc.getContentText()).toBe('new poem');
    expect(JSON.parse(doc.getField('content')).image).toBe('img.png');
  });

  it('appends an edit to a document', async () => {
    const save = makeSave();
    putText(save, { type: 'edits', documentId: 'doc_1b' }, 'teh');
    putText(save, { type: 'edits', documentId: 'doc_1b' }, 'adn');
    expect(save.getDocument('doc_1b').getEdits().map((e) => e.text)).toEqual(['teh', 'adn']);
  });

  it('round-trips: an appended edit is readable via getText', async () => {
    const save = makeSave();
    putText(save, { type: 'edits', documentId: 'doc_1b' }, 'mispeld');
    const out = await getText(save, { type: 'edits', scope: 'drift', filter: 'all' }, ctx);
    expect(out.map((e) => e.text)).toContain('mispeld');
  });

  it('returns null and does not throw for an unknown document', () => {
    expect(putText(makeSave(), { documentId: 'nope' }, 'x')).toBeNull();
  });
});

describe('getText — preface/suffix (prompt framing)', () => {
  it('wraps the resolved text into a single entry', async () => {
    const out = await getText(makeSave(), {
      scope: 'level', target: 'playing', filter: 'chosen',
      preface: 'You wrote:\n', suffix: '\nReflect.',
    }, ctx);
    expect(out).toEqual([{ name: 'content', text: 'You wrote:\na poem made of waste\nReflect.' }]);
  });

  it('applies preface/suffix to the fallback too', async () => {
    const out = await getText(makeSave(), {
      scope: 'level', target: 'never', filter: 'chosen',
      preface: '[', suffix: ']', fallback: 'seed',
    }, ctx);
    expect(out).toEqual([{ name: 'content', text: '[seed]' }]);
  });
});

describe('GameplaySave.migrate (v2)', () => {
  it('stamps driftName on legacy documents from selectedDrift on load', async () => {
    const legacy = JSON.stringify({
      metadata: { selectedDrift: 'Recycling' },
      documents: [{ id: 'd1', data: { levelId: '1', content: JSON.stringify({ text: 'x' }) } }],
    });
    const save = GameplaySave.fromJSON(legacy);
    expect(save.getDocument('d1').getDriftName()).toBe('Recycling');
    expect(save.getMetadata('version')).toBe(2);
  });

  it('does NOT stamp driftName onto level-less (standalone) docs', async () => {
    const legacy = JSON.stringify({
      metadata: { selectedDrift: 'tests' },
      documents: [
        { id: 'd1', data: { levelId: 'template', content: JSON.stringify({ text: 'a' }) } },
        { id: 'd2', data: { content: JSON.stringify({ text: 'standalone' }) } }, // no levelId
      ],
    });
    const save = GameplaySave.fromJSON(legacy);
    expect(save.getDocument('d1').getDriftName()).toBe('tests');
    expect(save.getDocument('d2').getDriftName()).toBeNull();
  });

  it('makes legacy docs resolvable by drift scope after migration', async () => {
    const legacy = JSON.stringify({
      metadata: { selectedDrift: 'Recycling' },
      documents: [{ id: 'd1', data: { levelId: '1', content: JSON.stringify({ text: 'legacy text' }) } }],
    });
    const save = GameplaySave.fromJSON(legacy);
    const out = await getText(save, { scope: 'drift', filter: 'all' }, { driftName: 'Recycling' });
    expect(out.map((e) => e.text)).toEqual(['legacy text']);
  });
});

describe('joinText', () => {
  it('flattens entries to a string', () => {
    expect(joinText([{ text: 'a' }, { text: 'b' }], ' ')).toBe('a b');
  });
});
