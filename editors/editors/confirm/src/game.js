import { iterateContentEditableWords, newWords } from './textIterator.js';

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
      ...params
    };

    this.settings = [
      { id: 'fontSize', name: 'Font Size', type: 'number', description: 'Font size for the editor text (px)' },
      { id: 'scale', name: 'Scale', default: 100, type: 'select', description: 'The editor scale (in percent)', options: [25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300] },
      { id: 'darkmode', name: 'Dark Mode', default: false, type: 'boolean', description: 'Dark mode for the editor' },
    ]

    
    // Initialize basic text editor
    this.editor = document.getElementById('editor');
    if (!this.editor) {
      throw new Error('Editor element not found');
    }

    // the height of #editor-container
    this.containerHeight = this.getContainerHeight();

    this.setInitialSettings();
    
    // Set any content from a save (usually set in MetaGame.js)
    if (this.params.initialState) {
      this.loadState(this.params.initialState);
    }
    
    this.editor.removeEventListener('input', this.handleInput.bind(this));
    this.editor.addEventListener('input', this.handleInput.bind(this));

    // Set the overlay css to match most of the values of the editor
    this.syncOverlay();

    // To support backward's compatability, MetaGame expects game to have a .performance property
    // with certain functions: loadState, getAllSettings, should document better
    this.performance = this;
  }

  loadState(state) {
    this.editor.textContent = state.text;
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

  handleInput(event) {
    if (event.inputType === 'insertText' && event.data.length > 0) {
      // if a space is inserted, we need to check the word before and after
      const isSpace = event.data === ' ';
      if (isSpace) {

        this.getTokens().then(tokens => {
          const newTokens = newWords(this.previousTokens, tokens);
          this.onNewTokens(newTokens);
          this.previousTokens = tokens;
        });
      }
    }
  }

  onNewTokens(newTokens) {
    if (!newTokens || newTokens.length === 0) return;

    let newText = newTokens.map(token => token.text).join(' ');

    // create a popup
    let text = `You wrote '${newText}'. Are you sure?`
    let confirmed = window.confirm(text);
    if (confirmed) {
      // do nothing
    } else {
      this.editor.textContent = this.editor.textContent.replace(newWords, '');
    }
  }

  // Perform the actual spell check (returns a promise)
  async getTokens() {
    if (!this.editor) return;
    let tokens = iterateContentEditableWords(this.editor);
    return tokens;
  }

  animateWord(word, dX, dY, scale, speed=500) {
    const { text, rect, node, startIndex, endIndex, parent: editor } = word;

    let overlay = document.getElementById('overlay');
    
    const newElement = document.createElement('div');
    newElement.classList.add('move');
    newElement.textContent = text;
    const { left, top, width, height } = rect;

    newElement.style.left = `${left}px`;
    newElement.style.top = `${top}px`;

    overlay.appendChild(newElement);

    // This is a weird hack to get around the fact that we ned to set the animation distance using the style in order for the
    // image capturer to recognize it (it doesn't play these animations)
    // We need to set the translateX to the place we want it to be seen, but immediately put it back to the start to make the next
    // // animation appear to begin at the start
    newElement.style.transform = `translateX(${dX}px) translateY(${dY}px) scale(${scale})`
    const animationFrames2 = [
      { transform: `translateX(${0}px) translateY(${0}px) scale(${1})` },
    ];
    const immediate = {
      duration: 0,
      iterations: 1,
    }
    newElement.animate(animationFrames2, immediate);
    // end hack

    const timing = {
      duration: speed,
      iterations: '1',
      fill: "forwards",
      easing: "ease-out",
    };
    const animationFrames = [
      { transform: `translateX(${0}px) translateY(${0}px) scale(${1})` },
      { transform: `translateX(${dX}px) translateY(${dY}px) scale(${scale})`},
      // { transform: `translateX(${0}px) translateY(${0}px) scale(${1})` },
    ];

    // https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Using_the_Web_Animations_API
    newElement.animate(animationFrames, timing);

    // make not selectable
    word.ghost = newElement;
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

