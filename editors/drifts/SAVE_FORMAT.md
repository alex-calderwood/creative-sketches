# Save format (cheat sheet)

One save lives in **`localStorage['gameplaySave']`** as JSON. One save = one drift playthrough.

```
{
  metadata: { ... },        // save-global state (selections, progress, pointers)
  documents: [ { id, data } ]   // the pages the player produced
}
```

## metadata

| key                | meaning                                              |
|--------------------|------------------------------------------------------|
| `version`          | save schema version (current: **2**)                 |
| `selectedDrift`    | which drift this save is playing                     |
| `selectedlevelId`  | level currently open                                 |
| `selectedDocumentId` | document the editor should load                    |
| `completedLevels`  | `[levelId, …]`                                       |
| `chosenDocuments`  | `{ levelId: documentId }` — the committed page per level |
| `allUnlocked`      | admin: ignore progression gating                     |
| `dateCreated` / `dateModified` | ISO timestamps                            |
| `edits`            | **legacy/inert** — pre-v2 misspellings, now stored per-document |

## documents[]

```
{ id: "doc_<timestamp>", data: {
    driftName,      // which drift (stamped at creation; back-filled by migrate)
    levelId,        // which level produced this
    sourceEditor,   // editor id
    title,
    createdAt, lastModified,
    content,        // CHANNEL 'content': JSON string { text, image }
    edits           // CHANNEL 'edits': [ { text } ]
} }
```

A document holds **typed channels**. Today: `content` (authored text) and `edits`
(misspellings, written by the spellcheck editor, read by poetris). Add a channel
by adding one extractor in `ContentQuery.js` + accessors in `Document.js`.

## Reading & writing text

All cross-level/cross-session text goes through **`ContentQuery.js`** — nothing
reads `localStorage` or parses `content` directly.

```js
// READ → always returns [{ name, text, … }]; use joinText() to flatten
await getText(save, { type, scope, target, filter, fallback, preface, suffix }, context)

// WRITE → one channel on one document
putText(save, { type, documentId, mode }, value)
```

| field    | values                                             |
|----------|----------------------------------------------------|
| `type`   | `content` \| `edits`                               |
| `scope`  | `document` \| `level` \| `drift` \| `editor` (drift-independent) |
| `target` | docId / levelId / driftName (defaults from context)|
| `filter` | `chosen` \| `all` \| `previous`                    |
| `fallback` | string \| `[{name,text}]` \| `{kind:'file',path}` \| **another query** (chained) |
| `mode`   | `set` \| `append` (write only)                     |

`context = { driftName, levelId, documentId, progression, fileLoader }`

Sandbox mode: pass `save = null` → the query resolves straight to its `fallback`.

drifts.json declares queries inline, e.g. a prompt that quotes prior work:

```json
{ "type": "content", "scope": "level", "filter": "chosen", "target": "playing",
  "preface": "You wrote:\n", "suffix": "\nReflect." }
```

## Admin / inspector (run `npm run server`, port 3008)

`http://localhost:3008/editors/drifts/admin.html`

One page, both jobs:
- **Inspect** — metadata, every document grouped by drift → level (chosen marked),
  every field rendered (self-updating: new fields/channels show automatically),
  drifts config, and raw save JSON.
- **Edit** — unlock all levels, delete a document, clear the whole save.

The save is a single `localStorage` key, so the page reads whatever the browser
currently holds — open it in the same browser/profile you play in.

## Migrating & testing

- **Migration:** `GameplaySave.migrate()` runs on every load (idempotent). v2 stamps `driftName` onto drift-level docs. Add future upgrades there.
- **Tests:** `npm test` → `drifts/ContentQuery.test.js`.
```
