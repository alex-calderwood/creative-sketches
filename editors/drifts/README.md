# MetaGame

save/load/progression system

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
      const metaGame = new MetaGame(PROJECT_ID);
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
    this.save = options.save || null;
    this.documentId = options.documentId || null;
    
    // Load content from save if available
    if (this.save && this.documentId) {
      const document = this.save.getDocument(this.documentId);
      if (document) {
        const content = document.getField('content');
        if (content) {
          // Load content into your editor
          document.getElementById('editor').innerText = content;
        }
      }
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
- `options.save` (GameplaySave): The save instance containing all documents
- `options.documentId` (string): ID of the current document to load

**Responsibilities:**
- Store save and documentId references
- Load content from `save.getDocument(documentId).getField('content')`
- Set up your editor's initial state
- Attach event listeners

**Example:**
```javascript
async initialize(options = {}) {
  this.save = options.save || null;
  this.documentId = options.documentId || null;
  
  if (this.save && this.documentId) {
    const doc = this.save.getDocument(this.documentId);
    const content = doc.getField('content');
    this.loadContent(content);
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

## Behavior Without Save

If no save exists in localStorage (e.g., after clicking "Clear"):
- MetaGame initializes the game without save/document parameters
- No controls UI appears
- No progression elements appear
- Game runs standalone

This allows editors to work independently without the MetaGame system.

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
