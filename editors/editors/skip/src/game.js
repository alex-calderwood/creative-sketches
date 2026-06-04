import { iterateContentEditableWords, getMatchingToken } from '/editors/vault/01-23-2026/src/document/textIterator.js';
import { Monitor } from '/editors/vault/01-23-2026/src/monitor/Monitor.js';

export class Game {
  constructor() {
    this.editor = null;
  }

  async initialize(params = {}) {
    this.params = {
      fontSize: 25,
      scale: 100,
      darkmode: false,
      initialState: null,
      continuousCheck: false,
      skipN: 4,
      highlight: false,
      highlightColor: '#fff172',
      backgroundColor: '#49F4DD',
      fontColor: '#000000',
      fillerWord: '___',
      ...params
    };

    this.settings = [
      { id: 'skipN', name: 'N', inBar: true, type: 'range', min: 1, max: 1000000, description: 'The mirror will display every Nth word of the original text. For instance, setting N=4 will display every 4th word on the right hand editor. This lets you compose a kind of hidden text within the original.' },
      { id: 'highlight', name: 'Highlight', inBar: true, type: 'boolean', description: 'Highlight every Nth word in the original editor?' },
      { id: 'highlightColor', short: " ", name: 'Highlight', inBar: true, type: 'color', default:  this.params.highlightColor, description: 'Highlight Color' },
      { id: 'backgroundColor', short: " ", name: 'Background', inBar: true, type: 'color', default:  this.params.backgroundColor, description: 'Background Color' },
      { id: 'fontColor', short: " ", name: 'Font', inBar: true, type: 'color', default:  this.params.fontColor, description: 'Font Color' },
      { id: 'darkmode', name: 'Dark Mode', inBar: true, default: this.params.darkmode, type: 'boolean', description: 'Dark Mode' },
      { id: 'fontSize', name: ' ', inBar: true, type: 'number', description: 'Font Size (px)' },
      { id: 'scale', name: 'Scale', inBar: true, default: this.params.scale, type: 'range', min: 1, max: 300, description: 'Page Scale (% of default value)' },
      { id: 'fillerWord', name: 'Placeholder Word', inBar: true, type: 'text', description: 'If you type in the right hand editor, this word will be used to fill in any gaps.' },
    ]
    
    // Initialize basic text editor
    this.editor = document.getElementById('editor');
    if (!this.editor) {
      throw new Error('Editor element not found');
    }

    // the height of #editor-container
    this.containerHeight = this.getContainerHeight();

    this.setInitialSettings();

    this.monitor = new Monitor(this.editor);

    // MetaGame hands us the saved document state (or level seed) as
    // initialState — no need to read the save/document here.
    if (this.params.initialState) {
      this.loadState(this.params.initialState);
    }
    
    this.monitor.on('keystroke', (keystroke) => this.onNewKeystroke(keystroke));

    this.syncStyles();
    this._initMirrorEditing();

    // To support backward's compatability, MetaGame expects game to have a .performance property
    // with certain functions: loadState, getAllSettings, should document better
    this.performance = this;
  }


  // Called by MetaGame.js
  saveState() {
    if (!this.editor) return null;
    return {
      text: this.editor.textContent || '',
      monitor: this.monitor.export(),
    };
  }

  loadState(state) {
    console.log("loadState", state);
    this.editor.textContent = state.text;
    if (state.monitor) this.monitor.import(state.monitor);
  }

  static setColors(isDark) {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }

  onSettingChanged(id, value, oldValue) {
    if (id === 'fontSize') {
      this.editor.style.fontSize = `${value}px`;
      this.syncStyles();
    } else if (id === 'scale') {
      this.setScale(value);
    } else if (id === 'darkmode') {
      Game.setColors(value);
    } else if (id === 'backgroundColor') {
      document.documentElement.style.setProperty('--background-color', value);
    } else if (id === 'fontColor') {
      document.documentElement.style.setProperty('--text-color', value);
    } else if (id === 'highlightColor') {
      document.documentElement.style.setProperty('--highlight', value + '60');
      this.updateHighlights();
    } else if (id === 'highlight') {
      this.updateHighlights();
    } else if (id === 'skipN') {
      this.applyEditorToMirror();
      this.updateHighlights();
    }
  }

  setInitialSettings() {
    this.onSettingChanged('scale', this.params.scale, null);
    this.onSettingChanged('fontSize', this.params.fontSize, null);
    this.onSettingChanged('darkmode', this.params.darkmode, null);
    this.onSettingChanged('backgroundColor', this.params.backgroundColor, null);
    this.onSettingChanged('fontColor', this.params.fontColor, null);
    this.onSettingChanged('highlightColor', this.params.highlightColor, null);
  }

  // This should return the height that defines "100%", the
  // standard from which updating the height by percent is measured
  // Currently, we measure this as the viewport height minus the height of 
  // the #game-banner, but this could be changed
  getContainerHeight() {
    let gameBanner = document.getElementById('game-banner');
    if (gameBanner) {
      let height = window.innerHeight - gameBanner.clientHeight;
      return height;
    }
    throw new Error('getContainerHeight: could not compute nominal height');
  }

  // set the editor container height as a percent of the parent height
  setScale(percent) {
    console.log('set', percent);
    let height = this.containerHeight * percent / 100;
    let editorContainer = document.getElementById('editor-container');
    if (editorContainer) {
      document.documentElement.style.setProperty('--editor-height', `${height}px`);
    }
  }

  syncStyles() {
    this.syncOverlayStyle();
    this.syncMirrorStyle();
  }

  syncOverlayStyle() {
    const overlay = document.getElementById('overlay');
    if (overlay && this.editor) {
      const editorRect = this.editor.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(this.editor);
      
      // Copy dimensions
      overlay.style.width = `${editorRect.width}px`;
      overlay.style.height = `${editorRect.height}px`;
      
      // Copy text styling (but not background)
      overlay.style.fontFamily = computedStyle.fontFamily;
      overlay.style.fontSize = computedStyle.fontSize;
      overlay.style.lineHeight = computedStyle.lineHeight;
      overlay.style.padding = computedStyle.padding;
      overlay.style.border = computedStyle.border;
      overlay.style.boxSizing = computedStyle.boxSizing;
      overlay.style.textAlign = computedStyle.textAlign;
      overlay.style.letterSpacing = computedStyle.letterSpacing;
      overlay.style.wordSpacing = computedStyle.wordSpacing;
    }
  }

  syncMirrorStyle() {
    // sync the style of the mirror to match the RHS editor
    const mirror = document.getElementById('editor-mirror');
    if (mirror && this.editor) {
      const computedStyle = window.getComputedStyle(this.editor);
      mirror.style.fontFamily = computedStyle.fontFamily;
      mirror.style.fontSize = computedStyle.fontSize;
      mirror.style.lineHeight = computedStyle.lineHeight;
      mirror.style.padding = computedStyle.padding;
      mirror.style.border = computedStyle.border;
      mirror.style.boxSizing = computedStyle.boxSizing;
      mirror.style.textAlign = computedStyle.textAlign;
      mirror.style.letterSpacing = computedStyle.letterSpacing;
      mirror.style.wordSpacing = computedStyle.wordSpacing;
    }
  }

  getNthWords() {
    const skipN = this.params.skipN;
    const words = iterateContentEditableWords(this.editor);
    return words.filter((_, index) => index % skipN === 0);
  }

  getMirrorText() {
    return this.getNthWords().map(w => w.text).join(' ');
  }

  // if the user types in the mirror side, we want to transfer that back over
  applyMirrorToEditor(mirrorText) {
    let nthWords = this.getNthWords();
    const mirrorWords = mirrorText.split(/\s+/).filter(w => w.length > 0);

    if (mirrorWords.length > nthWords.length) {
      const extra = mirrorWords.length - nthWords.length;
      const filler = Array(extra * this.params.skipN).fill(this.params.fillerWord).join(' ');
      this.editor.textContent += ' ' + filler;
      nthWords = this.getNthWords();
    }

    // Walk the text nodes and replace each Nth word at its exact position
    for (let i = nthWords.length - 1; i >= 0; i--) {
      if (i >= mirrorWords.length) continue;
      const word = nthWords[i];
      if (word.text === mirrorWords[i]) continue;

      const range = document.createRange();
      range.setStart(word.node, word.localStart);
      range.setEnd(word.node, word.localEnd);
      range.deleteContents();
      range.insertNode(document.createTextNode(mirrorWords[i]));

      // Normalize to merge adjacent text nodes
      word.node.parentNode.normalize();
    }
  }

  applyEditorToMirror() {
    const mirror = document.getElementById('editor-mirror');
    if (mirror) {
      mirror.textContent = this.getMirrorText();
    }
  }

  onNewKeystroke(keystroke) {
    if (this._mirrorEditing) return;
    this.applyEditorToMirror();
    this.updateHighlights();
  }

  _initMirrorEditing() {
    const mirror = document.getElementById('editor-mirror');
    if (!mirror) return;
    mirror.contentEditable = 'true';

    mirror.addEventListener('focus', () => { this._mirrorEditing = true; });
    mirror.addEventListener('blur', () => { this._mirrorEditing = false; });

    mirror.addEventListener('input', () => {
      this.applyMirrorToEditor(mirror.textContent);
      this.updateHighlights();
    });
  }

  updateHighlights() {
    const overlay = document.getElementById('overlay');
    if (!overlay) return;

    overlay.querySelectorAll('.highlight-mark').forEach(el => el.remove());

    if (!this.params.highlight) return;

    const nthWords = this.getNthWords();

    nthWords.forEach((word) => {
      const { rect } = word;
      if (!rect) return;
      const el = document.createElement('div');
      el.className = 'highlight-mark';
      el.style.position = 'absolute';
      el.style.left = `${rect.left}px`;
      el.style.top = `${rect.top}px`;
      el.style.width = `${rect.width}px`;
      el.style.height = `${rect.height}px`;
      el.style.background = 'var(--highlight)';
      el.style.pointerEvents = 'none';
      overlay.appendChild(el);
    });
  }

  getAllSettings() {
    console.log('getAllSettings', this.settings);
    return this.settings.map(setting => ({
      ...setting,
      value: this.params[setting.id]
    }));
  }

  updateSetting(id, value) {
    if (!(id in this.params)) {
      const validNames = Object.keys(this.params).join(', ');
      throw new Error(`Invalid setting name: ${id}. Valid names: ${validNames}`);
    }

    const oldValue = this.params[id];
    this.params[id] = value;
    this.onSettingChanged(id, value, oldValue);
  }
}

