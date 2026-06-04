// ContentQuery.js
//
// See ./SAVE_FORMAT.md for the save layout and a query cheat sheet.
//
// Single access point for reading and writing produced text across a save.
// Replaces the scattered paths (retrieveTextFromDrift / levelText, save.getEdits,
// level.sourceText, level.corpusFile, editsBackup, direct content parsing).
//
// READ:  getText(save, query, context) -> Promise<[{ name, text, ... }]>
// WRITE: putText(save, query, value)   -> Document | null
//
// A query selects WHAT text (type) from WHERE (scope + target + filter), with a
// fallback used when nothing resolves (sandbox mode, or a level not yet played).
// The return value is ALWAYS an array of { name, text } so a single source and
// many sources are handled uniformly. Use joinText() to flatten to a string.
//
//   query = {
//     type:   'content' | 'edits',              // default 'content'
//     scope:  'document' | 'level' | 'drift',   // default 'document'
//     target:  docId | levelId | driftName,     // defaults from context
//     filter: 'chosen' | 'all' | 'previous',    // level/drift scope
//     fallback: <query> | string | [{name,text}] | { kind:'file', path }
//   }
//
//   context = {
//     driftName, levelId, documentId,   // current position
//     progression: [levelId, ...],      // drift order, needed for 'previous'
//     fileLoader: async (path) => text  // override for { kind:'file' } fallback
//   }

// ---------------------------------------------------------------------------
// Type extractors: pull a channel's entries off a single document.
// Each returns an array of { name, text, documentId, levelId }.
// ---------------------------------------------------------------------------
const TYPE_EXTRACTORS = {
  content(doc) {
    const text = doc.getContentText ? doc.getContentText() : '';
    if (!text) return [];
    return [{
      name: 'content',
      text,
      documentId: doc.id,
      levelId: doc.getLevelId ? doc.getLevelId() : doc.getField?.('levelId'),
    }];
  },
  edits(doc) {
    const edits = doc.getEdits ? doc.getEdits() : (doc.getField?.('edits') || []);
    return edits
      .filter((e) => e && e.text)
      .map((e) => ({
        name: 'edit',
        text: e.text,
        documentId: doc.id,
        levelId: doc.getLevelId ? doc.getLevelId() : doc.getField?.('levelId'),
      }));
  },
};

// ---------------------------------------------------------------------------
// Document selection
// ---------------------------------------------------------------------------
function selectDocuments(save, query, context) {
  if (!save) return [];

  const scope = query.scope || 'document';
  const driftName = context.driftName;
  const chosen = save.getMetadata('chosenDocuments') || {};

  // Legacy docs predate driftName stamping; include them when undefined so old
  // saves still resolve. A save is single-drift in practice, so this is safe.
  const inDrift = (doc) => {
    const dn = doc.getField('driftName');
    return !driftName || dn == null || dn === driftName;
  };
  const docById = (id) => (id ? save.getDocument(id) : null);

  if (scope === 'document') {
    const doc = docById(query.target || context.documentId);
    return doc ? [doc] : [];
  }

  // Editor scope is drift-independent: every document an editor produced,
  // anywhere. Useful outside the drift progression (e.g. standalone editors).
  if (scope === 'editor') {
    const editor = query.target || context.sourceEditor;
    return save.getAllDocuments().filter((d) => d.getField('sourceEditor') === editor);
  }

  if (scope === 'level') {
    const levelId = query.target || context.levelId;
    const filter = query.filter || 'chosen';
    if (filter === 'chosen') {
      const doc = docById(chosen[levelId]);
      return doc ? [doc] : [];
    }
    // 'all' — every document (including drafts) for this level
    return save
      .getAllDocuments()
      .filter((d) => d.getField('levelId') === levelId && inDrift(d));
  }

  if (scope === 'drift') {
    const target = query.target || driftName;
    const filter = query.filter || 'all';
    const progression = context.progression || [];

    if (filter === 'all') {
      return save.getAllDocuments().filter((d) => {
        const dn = d.getField('driftName');
        return dn === target || (target === driftName && dn == null);
      });
    }
    if (filter === 'chosen') {
      return progression.map((lvl) => docById(chosen[lvl])).filter(Boolean);
    }
    if (filter === 'previous') {
      const idx = progression.indexOf(context.levelId);
      const prior = idx >= 0 ? progression.slice(0, idx) : progression;
      return prior.map((lvl) => docById(chosen[lvl])).filter(Boolean);
    }
  }

  return [];
}

// ---------------------------------------------------------------------------
// Fallback resolution — chained: a fallback may itself be a query with its
// own fallback, terminating in a literal string, array, or file.
// ---------------------------------------------------------------------------
async function defaultFileLoader(path) {
  if (typeof fetch === 'undefined') {
    throw new Error('ContentQuery: no fetch available to load ' + path);
  }
  const res = await fetch(path);
  return res.text();
}

async function resolveFallback(save, fallback, context) {
  if (fallback == null) return [];
  if (typeof fallback === 'string') {
    return [{ name: 'fallback', text: fallback }];
  }
  if (Array.isArray(fallback)) {
    return fallback;
  }
  if (fallback.kind === 'file') {
    const loader = context.fileLoader || defaultFileLoader;
    try {
      const text = await loader(fallback.path);
      return [{ name: fallback.name || 'file', text, path: fallback.path }];
    } catch (err) {
      console.error('ContentQuery: file fallback failed', fallback.path, err);
      return [];
    }
  }
  // Otherwise treat the fallback as a nested query (with its own fallback).
  return getText(save, fallback, context);
}

// ---------------------------------------------------------------------------
// READ
// ---------------------------------------------------------------------------
export async function getText(save, query, context = {}) {
  if (query == null) return [];
  // Convenience: a bare string is a literal; a pre-built array passes through.
  if (typeof query === 'string') return [{ name: 'literal', text: query }];
  if (Array.isArray(query)) return query;

  const type = query.type || 'content';
  const extract = TYPE_EXTRACTORS[type];

  let result;
  if (!extract) {
    console.error('ContentQuery: unknown type', type, query);
    result = await resolveFallback(save, query.fallback, context);
  } else {
    const docs = selectDocuments(save, query, context).filter(Boolean);
    const entries = [];
    for (const doc of docs) entries.push(...extract(doc));
    result = entries.length > 0
      ? entries
      : await resolveFallback(save, query.fallback, context);
  }

  // preface/suffix wrap the resolved text into a single entry (used for
  // prompts that frame prior work, e.g. "You wrote:\n<text>\nReflect…").
  if (query.preface != null || query.suffix != null) {
    const pre = query.preface != null ? String(query.preface) : '';
    const suf = query.suffix != null ? String(query.suffix) : '';
    return [{ name: 'content', text: pre + joinText(result) + suf }];
  }
  return result;
}

// Flatten getText output to a single string.
export function joinText(entries, separator = '\n\n') {
  return (entries || []).map((e) => e.text).filter(Boolean).join(separator);
}

// ---------------------------------------------------------------------------
// WRITE — always targets one document. Reading is cross-document; writing is
// where you are.
//   query = { type:'content'|'edits', documentId, mode:'set'|'append' }
//   value = string | { text, ... }
// ---------------------------------------------------------------------------
export function putText(save, query = {}, value, context = {}) {
  if (!save) return null;

  const type = query.type || 'content';
  const documentId = query.documentId || query.target || context.documentId;
  const doc = documentId ? save.getDocument(documentId) : null;
  if (!doc) {
    console.error('putText: no document for id', documentId, query);
    return null;
  }

  if (type === 'content') {
    if (typeof value === 'string') doc.setContentText(value);
    else doc.setContent(value);
  } else if (type === 'edits') {
    const edit = typeof value === 'string' ? { text: value } : value;
    const mode = query.mode || 'append';
    if (mode === 'set') doc.setEdits([edit]);
    else doc.appendEdit(edit);
  } else {
    console.error('putText: unknown type', type, query);
    return null;
  }

  const now = new Date().toISOString();
  doc.setField('lastModified', now);
  save.setMetadata('dateModified', now);
  persist(save);
  return doc;
}

function persist(save) {
  try {
    if (typeof localStorage !== 'undefined') save.saveToLocalStorage();
  } catch (err) {
    console.warn('ContentQuery: persist skipped', err);
  }
}
