import { iterateContentEditableWords, getMatchingToken, getTextNodeAtOffset } from '/editors/vault/01-23-2026/src/document/textIterator.js';
import { Monitor }  from '/editors/vault/01-23-2026/src/monitor/Monitor.js';
import { Playback } from '/editors/vault/01-23-2026/src/monitor/Playback.js';

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
      debug: false,
      redact: true,
      tokens: false,
      ...params
    };

    this.settings = [
      { id: 'redact', name: 'Redact Text', default: true, type: 'boolean', description: 'Redact the hidden text. When false, the hidden text will be slightly visible.', 'inBar': true },
      { id: 'fontSize', name: 'Font Size', type: 'number', description: 'Font size for the editor text (px)', },
      { id: 'tokens', name: "Words", type: 'boolean', description: 'Show tokens', default: true, 'inBar': true },
      { id: 'scale', name: 'Scale', default: 100, type: 'select', description: 'The editor scale (in percent)', options: [25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300]},
      { id: 'darkmode', inBar: true, name: 'Dark Mode', default: false, type: 'boolean', description: 'Dark mode for the editor',  'inBar': true  },
      { id: 'debug', name: 'Debug', default: false, type: 'boolean', description: 'Debug mode for the editor' },
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
    this.monitor.on('keystroke', (keystroke) => this.onNewKeystroke(keystroke));
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
    } else if (name === 'debug') {
      this.params.debug = value;
      this._startDebugDisplays();
    } else if (name === 'tokens') {
      this.params.tokens = value;
      this._startMainPlayback();
    } else {
      this.params[name] = value;
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

  onNewKeystroke(evt) {
    this.showRecentLetter(evt);
    this.wrapTextWithSpans(document.getElementById('overlay'));
  }

  onNewToken(token) {
    // const words = iterateContentEditableWords(this.editor);
    // const match = getMatchingToken(words, token);
    // if (match) {
    //   // this.showLetterLast(match);
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
    const dX = 0, dY = 0, scale = 1, speed = 1000;

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

      setTimeout(() => {
        newElement.remove();
      }, speed);
    } catch (e) {
      // Range can fail for edge-case offsets (e.g. block-boundary newlines)
    }
  }

  hideLetter(word) {
    const { text, rect, node, startIndex, endIndex, parent: editor } = word;
    const overlay = document.getElementById('overlay');
    const overlayRect = overlay.getBoundingClientRect();
    const newElement = document.createElement('div');
    newElement.classList.add('move');
    newElement.textContent = text;
    newElement.style.left = `${rect.left - overlayRect.left}px`;
  }

  showRecentLetter(char) {
    const editor = this.editor;
    let node = editor;
    while (node && node.nodeType !== Node.TEXT_NODE) {
      node = node.childNodes[node.childNodes.length - 1];
    }
    if (!node || node.textContent.length === 0) return;

    const lastChar = node.textContent[node.textContent.length - 1];
    const range = document.createRange();
    range.setStart(node, node.textContent.length - 1);
    range.setEnd(node, node.textContent.length);
    const rect = range.getBoundingClientRect();
    const overlayRect = overlay.getBoundingClientRect();

    this.showLetter(lastChar, {left: rect.left - overlayRect.left, top: rect.top - overlayRect.top})
  }

  showLetter(char, rect, duration = 2000) {
    if (!rect) return;
    const overlay = document.getElementById('overlay');

    this.wrapTextWithSpans(overlay);

    // make a span for the character that was just typed
    const span = document.createElement('span');
    span.textContent = char;
    span.classList.add('visible');
    span.style.position = 'absolute';
    span.style.left = rect.left + 'px';
    span.style.top = rect.top + 'px';
    span.style.transform = 'translateX(0px) translateY(0px) scale(1)';
    overlay.appendChild(span);

    // fade out
    span.animate([
      { opacity: 1, offset: 0.75 },
      { opacity: 0 },
    ], {
      duration: duration,
      iterations: 1,
      fill: 'forwards',
      easing: 'ease-in',
    });
    setTimeout(() => {
      span.remove();
    }, duration + 100);

  }

  wrapTextWithSpans(overlay) {
    const words = iterateContentEditableWords(this.editor).filter(w => w.rect);
    const existing = [...overlay.querySelectorAll('.overlay-text')];

    words.forEach((word) => {
      const span = document.createElement('span');
      span.classList.add('overlay-text');
      span.classList.add(this.params.redact ? 'redact' : 'faded');
      span.textContent = word.text;
      span.style.left = word.rect.left + 'px';
      span.style.top = word.rect.top + 'px';
      span.style.width = word.rect.width + 'px';
      span.style.height = word.rect.height + 'px';
      overlay.appendChild(span);
    });
    for (let i = words.length; i < existing.length; i++) existing[i].remove();
  }

  _startKeystrokeDisplay() {
    this._mainPlayback = new Playback(this.monitor);
    this._startMainPlayback();
  }

  _startMainPlayback() {
    this._mainPlayback.pause();
    this._mainPlayback.reset();

    if (this.params.tokens) {
      this._mainPlayback.play((token) => {
        this.showLetter(token.text, token.currentRect || token.rect);
      }, { stream: 'tokens', loop: true, interval: 'timestamp' });
    } else {
      this._mainPlayback.play(({ item, type }) => {
        if (type === 'char') {
          this.showLetter(item.ch, item.currentRect || item.rect);
        }
      // }, { loop: true, interval: 'timestamp' });
      }, { loop: true, interval: 58 });
    }

    // Debug: separate playbacks for chars, tokens, events
    this._startDebugDisplays();
  }

  _startDebugDisplays() {
    if (this._debugEls) this._debugEls.forEach(el => el.remove());
    if (this._debugPlaybacks) this._debugPlaybacks.forEach(p => p.pause());
    this._debugEls = [];
    this._debugPlaybacks = [];
    if (!this.params.debug) return;

    const makeEl = (bottom, color) => {
      const el = document.createElement('div');
      Object.assign(el.style, {
        position: 'fixed', right: '12px', bottom: `${bottom}px`,
        padding: '8px 14px', background: 'rgba(0,0,0,0.8)', color,
        fontFamily: 'monospace', fontSize: '14px', borderRadius: '6px',
        zIndex: '9999', minWidth: '60px', pointerEvents: 'none',
      });
      document.body.appendChild(el);
      this._debugEls.push(el);
      return el;
    };

    const charEl  = makeEl(12, '#0f0');
    const tokenEl = makeEl(48, '#0ff');
    const eventEl = makeEl(84, '#ff0');

    const charP = new Playback(this.monitor);
    charP.play((char) => {
      const ch = /\s/.test(char.ch) ? '␣' : char.ch;
      charEl.textContent = `char [${charP.charIndex}] ${ch}  ${char.alive ? '●' : '○'}`;
    }, { stream: 'chars', interval: 500 });

    const tokenP = new Playback(this.monitor);
    tokenP.play((token) => {
      tokenEl.textContent = `token [${tokenP.tokenIndex}] ${token.text}  ${token.alive ? '●' : '○'}`;
    }, { stream: 'tokens', interval: 800 });

    const eventP = new Playback(this.monitor);
    eventP.play((event) => {
      let label = event.data ?? '';
      if (event.type === 'delete') label = '⌫';
      else if (event.type === 'undo') label = '↩';
      else if (event.type === 'redo') label = '↪';
      if (/\s/.test(label)) label = '␣';
      eventEl.textContent = `event [${event.index}] ${event.type} ${label}`;
    }, { stream: 'keystrokes', interval: 'timestamp', min: 50, max: 1000 });

    this._debugPlaybacks = [charP, tokenP, eventP];
  }

  getAllSettings() {
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

