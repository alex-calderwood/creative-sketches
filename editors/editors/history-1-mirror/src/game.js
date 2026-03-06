import { iterateContentEditableWords, getMatchingToken, getTextNodeAtOffset } from './textIterator.js';
import { Monitor } from './Monitor.js';
import { Playback } from './Playback.js';

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
      { id: 'darkmode', inBar: true, name: 'Dark Mode', default: false, type: 'boolean', description: 'Dark mode for the editor' },
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
    this.playback = new Playback(this.monitor);
    
    // Set any content from a save (usually set in MetaGame.js)
    if (this.params.initialState) {
      this.loadState(this.params.initialState);
    }
    
    // Set the overlay css to match most of the values of the editor
    this.syncOverlay();
    this.monitor.on('token', (token) => this.onNewToken(token));
    this._startKeystrokeDisplay();

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

  onNewToken(token) {
    const words = iterateContentEditableWords(this.editor);
    const match = getMatchingToken(words, token);
    console.log("token", token, match);
    // if (match) {
    //   this.animateWord(match, 0, -10, 1, 3000);
    // }
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

  animateLetter(char) {
    const { ch, index } = char;
    const pos = getTextNodeAtOffset(this.editor, index);
    if (!pos) return;

    const overlay = document.getElementById('overlay');
    const overlayRect = overlay.getBoundingClientRect();

    try {
      const range = document.createRange();
      range.setStart(pos.node, pos.offset);
      range.setEnd(pos.node, pos.offset + 1);
      const rect = range.getBoundingClientRect();

      const newElement = document.createElement('div');
      newElement.classList.add('move');
      newElement.classList.add('letter');
      newElement.textContent = ch;
      newElement.style.left = `${rect.left - overlayRect.left}px`;
      newElement.style.top = `${rect.top - overlayRect.top}px`;
      overlay.appendChild(newElement);

      const dX = 0, dY = 10, scale = 1, speed = 1000;
      newElement.style.transform = `translateX(${dX}px) translateY(${dY}px) scale(${scale})`;
      newElement.animate(
        [{ transform: `translateX(0px) translateY(0px) scale(1)` }],
        { duration: 0, iterations: 1 }
      );
      newElement.animate(
        [
          { transform: `translateX(0px) translateY(0px) scale(1)` },
          { transform: `translateX(${dX}px) translateY(${dY}px) scale(${scale})` },
        ],
        { duration: speed, iterations: 1, fill: 'forwards', easing: 'ease-out' }
      );
    } catch (e) {
      // Range can fail for edge-case offsets (e.g. block-boundary newlines)
    }
  }

  _startKeystrokeDisplay() {
    const makeEl = (bottom, color) => {
      const el = document.createElement('div');
      Object.assign(el.style, {
        position: 'fixed', right: '12px', bottom: `${bottom}px`,
        padding: '8px 14px', background: 'rgba(0,0,0,0.8)', color,
        fontFamily: 'monospace', fontSize: '14px', borderRadius: '6px',
        zIndex: '9999', minWidth: '60px', pointerEvents: 'none',
      });
      document.body.appendChild(el);
      return el;
    };

    // const charEl        = makeEl(12, '#0f0');
    // const activeCharEl  = makeEl(48, '#8f8');
    // const eventEl       = makeEl(84,  '#ff0');
    // const tokenEl       = makeEl(120,  '#0ff');
    // const activeTokenEl = makeEl(156,  '#8ff');
    // const mixedEl       = makeEl(192,  '#fff');

    const charPlayback        = new Playback(this.monitor);
    const activeCharPlayback  = new Playback(this.monitor, { mode: 'active' });
    const eventPlayback       = new Playback(this.monitor);
    const tokenPlayback       = new Playback(this.monitor);
    const activeTokenPlayback = new Playback(this.monitor, { mode: 'active' });
    const mixedPlayback       = new Playback(this.monitor);

    // Characters: all inserted chars (history)
    // setInterval(() => {
    //   const char = charPlayback.nextChar();
    //   if (!char && this.monitor.getCharCount() > 0) { charPlayback.goToChar(-1); return; }
    //   if (char) {
    //     charEl.textContent = `char [${charPlayback.charIndex}] ${/\s/.test(char.ch) ? '␣' : char.ch}`;
    //   }
    // }, 500);

    // Characters: active only (current document)
    // setInterval(() => {
    //   const char = activeCharPlayback.nextChar();
    //   if (!char && this.monitor.getActiveCharCount() > 0) { activeCharPlayback.goToChar(-1); return; }
    //   if (char) {
    //     activeCharEl.textContent = `char* [${activeCharPlayback.charIndex}] ${/\s/.test(char.ch) ? '␣' : char.ch}`;
    //   }
    // }, 500);

    // Events: all events including deletes + mirror playback
    const mirror = document.getElementById('editor-mirror');
    if (mirror) mirror.style.whiteSpace = 'pre-wrap';

    Playback.iterateKeystrokes(eventPlayback, (event) => {
      let label = event.data ?? '';
      if (event.type === 'delete') label = '⌫';
      else if (event.type === 'undo') label = '↩';
      else if (event.type === 'redo') label = '↪';
      if (/\s/.test(label)) label = '␣';
      // eventEl.textContent = `event [${event.index}] ${event.type} ${label}`;
      if (mirror) mirror.textContent = event.textSnapshot;
    }, { loop: true, interval: 'timestamp' });


    // Tokens: all completed words (history)
    // setInterval(() => {
    //   const token = tokenPlayback.nextToken();
    //   if (!token && this.monitor.getTokenCount() > 0) { tokenPlayback.goToToken(-1); return; }
    //   if (token) {
    //     tokenEl.textContent = `token [${token.tokenIndex}] ${token.text}`;

    //     if (!token.active) {
    //       tokenEl.style.color = 'red';
    //     } else {
    //       tokenEl.style.color = '#0ff'
    //     }
    //   }
    // }, 500);

    // Tokens: active only (still in document)
    // Playback.iterateTokens(activeTokenPlayback, (token) => {
    //   activeTokenEl.textContent = `token* [${activeTokenPlayback.tokenIndex}] ${token.text}`;
    //   // const words = iterateContentEditableWords(this.editor);
    //   // const match = getMatchingToken(words, token);
    //   // this.animateWord(match, 0, -10, 1, 3000);
    // }, { loop: true, interval:'timestamp' });

    // Chars + tokens: interleaved by timestamp
    // Playback.iterate(mixedPlayback, ({ item, type }) => {
    //   if (type === 'token') {

    //     const words = iterateContentEditableWords(this.editor);
    //     // const match = getMatchingToken(words, item);
    //     // if (match) this.animateWord(match, 0, -10, 1, 3000);
    //     mixedEl.textContent = `mixed [${mixedPlayback.tokenIndex}] ${item.text}`;
    //     mixedEl.style.color = '#0ff';
    //   } else {
    //     // this.animateLetter(item);

    //     // mixedEl.textContent = `mixed [${mixedPlayback.charIndex}] ${item.ch}`;
    //     // mixedEl.style.color = '#0f0';
    //   }

    // }, { loop: true, interval: 300 });

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

