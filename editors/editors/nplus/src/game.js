import { iterateContentEditableWords, getMatchingToken } from './textIterator.js';
import { Monitor } from './Monitor.js';

export class Game {
  constructor() {
    this.editor = null;
  }

  async initialize(params = {}) {
    this.params = {
      fontSize: 16,
      scale: 100,
      darkmode: false,
      initialState: null,
      continuousCheck: false,
      everyN: 4,
      highlight: false,
      highlightColor: '#fff172',
      backgroundColor: '#e7e7e7',
      ...params
    };

    this.settings = [
      { id: 'fontSize', name: 'Font Size', type: 'number', description: 'Font size for the editor text (px)' },
      { id: 'everyN', name: 'N+', inBar:true, type: 'number', description: 'The mirror will display every nth word of the original text. This lets you compose a kind of hidden text within the original.' },
      { id: 'highlight', name: 'Highlight', inBar: true, type: 'boolean', description: 'Highlight every Nth word in the original editor' },
      { id: 'highlightColor', name: 'Highlight Color', inBar: true, type: 'color', default: '#fff172', description: 'Color of the highlight on every Nth word' },
      { id: 'backgroundColor', name: 'Background', inBar: false, type: 'color', default: '#e7e7e7', description: 'Background color of the editor' },
      { id: 'darkmode', name: 'Dark Mode', inBar: true, default: false, type: 'boolean', description: 'Dark mode for the editor' },
      { id: 'scale', name: 'Scale', inBar:true, default: 100, type: 'range', min: 1, max: 300, description: 'Page scale (% of default value)' },
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
    
    if (this.params.initialState) {
      this.loadState(this.params.initialState);
    }
    
    this.monitor.on('token', (token) => this.onNewToken(token));

    this.monitor.on('keystroke', (keystroke) => this.onNewKeystroke(keystroke));

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

  onSettingChanged(name, value, oldValue) {
    if (name === 'fontSize') {
      this.editor.style.fontSize = `${value}px`;
    } else if (name === 'scale') {
      this.setScale(value);
    } else if (name === 'darkmode') {
      Game.setColors(value);
    } else if (name === 'backgroundColor') {
      document.documentElement.style.setProperty('--background-color', value);
    } else if (name === 'highlightColor') {
      document.documentElement.style.setProperty('--highlight', value + '60');
      this.updateHighlights();
    } else if (name === 'highlight' || name === 'everyN') {
      this.updateHighlights();
    }
  }

  setInitialSettings() {
    this.onSettingChanged('scale', this.params.scale, null);
    this.onSettingChanged('fontSize', this.params.fontSize, null);
    this.onSettingChanged('darkmode', this.params.darkmode, null);
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

  onNewToken(token) {
    const words = iterateContentEditableWords(this.editor);
    const match = getMatchingToken(words, token);
    console.log("token", token, match);
    // if (match) {
    //   this.animateWord(match, 0, -10, 1, 3000);
    // }
  }

  getNthWords() {
    const everyN = this.params.everyN;
    const words = iterateContentEditableWords(this.editor);
    return words.filter((_, index) => index % everyN === 0);
  }

  getMirrorText() {
    return this.getNthWords().map(w => w.text).join(' ');
  }

  applyMirrorToEditor(mirrorText) {
    const nthWords = this.getNthWords();
    const mirrorWords = mirrorText.split(/\s+/).filter(w => w.length > 0);

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

  onNewKeystroke(keystroke) {
    if (this._mirrorEditing) return;
    const mirror = document.getElementById('editor-mirror');
    if (mirror) {
      mirror.textContent = this.getMirrorText();
    }
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

