export class Game {
  constructor() {
    this.editor = null;
  }

  async initialize(params = {}) {
    this.params = {
      fontSize: 16,
      width: 100,
      darkmode: false,
      initialState: null,
      ...params
    };

    this.settings = [
      { name: 'fontSize', type: 'number', description: 'Font size for the editor text (px)' },
      { name: 'width', default: 100, type: 'select', description: 'Editor width', options: [50, 75, 100, 125, 150, 175, 200] },
      { name: 'darkmode', default: false, type: 'boolean', description: 'Dark mode for the editor' },
    ]

    // Initialize basic text editor
    this.editor = document.getElementById('editor');
    if (!this.editor) {
      throw new Error('Editor element not found');
    }

    // Make editor contenteditable
    this.editor.contentEditable = true;
    
    // Apply initial settings
    this.onSettingChanged('fontSize', this.params.fontSize, null);
    this.onSettingChanged('width', this.params.width, null);
    this.onSettingChanged('darkmode', this.params.darkmode, null);
    
    if (this.params.initialState) {
      this.loadState(this.params.initialState);
    }
  }

  loadState(state) {
    this.editor.textContent = state.text;
  }

  static setColors(isDark) {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }

  perfomance() {
    return this;
  }

  onSettingChanged(name, value, oldValue) {
    if (name === 'fontSize') {
      this.editor.style.fontSize = `${value}px`;
    } else if (name === 'width') {
      let width = this.params.baseWidth * value / 100;
      this.editor.parentElement.style.width = `${width}px`;
    } else if (name === 'darkmode') {
      Game.setColors(value);
    }
  }

  // Called by MetaGame.js
  saveState() {
    if (!this.editor) return null;
    return {
      text: this.editor.textContent || ''
    };
  }


  syncOverlay() {
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

  getAllSettings() {
    return this.settings.map(setting => ({
      ...setting,
      value: this.params[setting.name]
    }));
  }

  updateSetting(name, value) {
    if (!(name in this.params)) {
      const validNames = Object.keys(this.params).join(', ');
      throw new Error(`Invalid setting name: ${name}. Valid names: ${validNames}`);
    }

    const oldValue = this.params[name];
    this.params[name] = value;
    this.onSettingChanged(name, value, oldValue);
  }
}