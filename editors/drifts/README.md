# MetaGame

save/load/progression system

> **Save file structure & text queries:** see [`SAVE_FORMAT.md`](./SAVE_FORMAT.md)
> for the metadata/document layout, channels, and the `getText`/`putText` API.
>
> **Admin / inspector** (with `npm run server`, port 3008):
> `/editors/drifts/admin.html` — inspect the save (metadata, documents, all
> fields) and edit it (unlock levels, delete docs, clear save).

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
  - [1. HTML Setup](#1-html-setup)
  - [2. Game Class Implementation](#2-game-class-implementation)
- [Required Methods](#required-methods)
  - [initialize()](#async-initializeoptions)
  - [saveState()](#savestate)
  - [performance](#performance-getter)
- [Progression System (Optional)](#progression-system-optional)
- [Behavior Without Save](#behavior-without-save)
- [Required HTML Elements](#required-html-elements)
- [CSS Variables](#css-variables)
- [Project Structure](#project-structure)
- [Examples](#examples)

## Overview

MetaGame provides:
- **Save/Load Management**: Automatic localStorage persistence with manual download/upload
- **Document Management**: Multiple documents per save with metadata
- **Progression System**: Optional prompts and completion workflows from `drifts.json`
- **Controls UI**: Save, Load, Download, New Document, Settings buttons
- **Autosave**: Automatic saving on content change

## Quick Start

### 1. HTML Setup

Your editor needs these elements:

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Editor</title>
  <!-- Load required scripts -->
  <script src="/editors/drifts/Document.js"></script>
  <script src="/editors/drifts/GameplaySave.js"></script>
  <script src="/editors/drifts/Drifts.js"></script>
</head>
<body>
  <!-- Controls container (required) -->
  <div id="controls" class="controls"></div>

  <!-- Optional: Prompt display for progression system -->
  <div id="prompt-display" class="meta-game"></div>

  <!-- Your editor content -->
  <div id="editor" contenteditable="true"></div>

  <!-- Optional: Submit button for progression system -->
  <div id="submit" class="meta-game"></div>

  <script type="module">
    import { Game } from './game.js';
    import { MetaGame } from '/editors/drifts/MetaGame.js';
    
    const PROJECT_ID = 'my-editor-id';
    
    document.addEventListener('DOMContentLoaded', async () => {
      const game = new Game();
      const metaGame = new MetaGame(PROJECT_ID, PROJECT_NAME);
      await metaGame.initialize(game);
    });
  </script>
</body>
</html>
```

### 2. Game Class Implementation

Your `Game` class must implement the interface defined in `AbstractGame.js`.

You can optionally extend it:

```javascript
import { AbstractGame } from '/editors/drifts/AbstractGame.js';

export class Game extends AbstractGame {
  // Your implementation
}
```

Or create your own class with the required methods:

```javascript
export class Game {
  constructor() {
    this.save = null;
    this.documentId = null;
  }

  /**
   * Initialize the game
   * @param {Object} options
   * @param {GameplaySave} options.save - Save instance
   * @param {string} options.documentId - Current document ID
   */
  async initialize(options = {}) {
    // MetaGame hands you the saved document state (or the level's seed) as
    // options.initialState — already parsed. Do NOT read the save/document
    // yourself; just load the state.
    if (options.initialState) {
      this.loadState(options.initialState);
    }

    // Initialize your editor here
  }

  /**
   * Save the current state
   * @returns {Object} State object with 'text' property
   */
  saveState() {
    const editor = document.getElementById('editor');
    return {
      text: editor.innerText
    };
  }

  /**
   * Required for settings UI
   * @returns {Object} Performance object with settings methods
   */
  get performance() {
    return {
      getAllSettings: () => ({}),
      updateSetting: (name, value) => {}
    };
  }
}
```

## Required Methods

### `async initialize(options)`

Called when the game starts or when a document is loaded.

**Parameters:**
- `options.initialState` (object): The saved document state to restore (already
  parsed). For a new document this is the level's `initialState` seed; for a
  resumed document it's the last saved state. The shape is whatever your
  `saveState()` returns.
- `options.save` (GameplaySave) / `options.documentId` (string): provided for
  editors that need them (e.g. writing extra channels), but most editors should
  **not** read content from the save directly — use `options.initialState`.

**Responsibilities:**
- Restore from `options.initialState` (don't read `save.getDocument(...)` yourself)
- Set up your editor's initial state
- Attach event listeners

**Example:**
```javascript
async initialize(options = {}) {
  if (options.initialState) {
    this.loadState(options.initialState);
  }
}
```

### `saveState()`

Called when the user clicks "Save" or during autosave.

**Returns:** Object with `text` property (string)

**Responsibilities:**
- Collect current editor state
- Return as `{ text: string }` where text is the content to save

**Example:**
```javascript
saveState() {
  const editor = document.getElementById('editor');
  return {
    text: editor.innerText
  };
}
```

### `performance` (getter)

Provides access to editor settings for the Settings UI.

**Returns:** Object with:
- `getAllSettings()`: Returns object of settings `{ settingName: { name, type, value, options?, description? } }`
- `updateSetting(name, value)`: Updates a setting value

**Example:**
```javascript
get performance() {
  return {
    getAllSettings: () => ({
      fontSize: {
        name: 'Font Size',
        type: 'number',
        value: this.fontSize,
        description: 'Font size in pixels'
      },
      theme: {
        name: 'Theme',
        type: 'select',
        value: this.theme,
        options: ['light', 'dark'],
        description: 'Editor theme'
      }
    }),
    updateSetting: (name, value) => {
      if (name === 'fontSize') this.fontSize = value;
      if (name === 'theme') this.theme = value;
    }
  };
}
```

## Progression System (Optional)

To enable prompts and submit workflows, add your editor to `drifts.json`:

```json
{
  "My Drift": {
    "levels": {
      "task-1": {
        "editor": "my-editor-id",
        "prompt": "Write a story about...",
        "initialState": {
          "text": "Once upon a time,\n\n"
        }
      }
    }
  }
}
```

When a save exists and the editor is configured in drifts.json:
- Prompt appears in `#prompt-display`
- Submit button appears in `#submit`
- New documents start with `initialState.text`

## Save Always Exists

MetaGame **always** provides a save. If none is found in localStorage, it
creates a fresh empty `GameplaySave` (logged as "standalone mode"). This means:

- `options.save` and `options.documentId` are always passed to `game.initialize()`
- Save/Load/Download controls are always available — you can save and load
  documents even outside a drift
- A standalone editor reuses its most recent document instead of creating a new
  one on every visit

**Progression elements** (prompt, submit) still only appear when the editor is
running a drift level (i.e. the save's selected level maps to this editor).
Outside a drift:
- No prompt is shown
- Submit (if the editor renders a `#submit` element) navigates back to the
  editors list rather than the drifts menu

> Earlier versions ran the game with no save/document when localStorage was
> empty. That no longer happens — a save is always present.

## CSS Variables

MetaGame uses these CSS variables (define in your stylesheet):

```css
:root {
  --font: 'Your Font', sans-serif;
  --primary-color: #000;
  --background-color: #fff;
  --text-color: #000;
  --button-color: #000;
  --highlight: #eee;
}
```

## Required HTML Elements

MetaGame looks for these elements in your page:

| Element ID | Required | Purpose |
|-----------|----------|---------|
| `controls` | Yes | Container for save/load controls UI |
| `prompt-display` | No | Displays progression prompts from drifts.json |
| `submit` | No | Container for submit button (progression system) |
| `editor` or `grid` | No* | Editor element for autosave detection |

*Autosave works if you have an element with id `editor` or `grid`. If your editor uses different IDs, autosave won't trigger automatically (but manual save still works).

**Classes:**
- `.meta-game` - Elements with this class are hidden by default and shown only when progression system is active

## Examples

See these editors for reference implementations:
- `editors/hyper-2-3/` - Text editor with word overlays
- `editors/concrete-2-1-drifts/` - Grid-based spatial text editor
