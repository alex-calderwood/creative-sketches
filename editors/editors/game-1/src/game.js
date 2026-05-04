import { iterateContentEditableWords } from './textIterator.js';
import { Monitor } from '/editors/vault/01-23-2026/src/monitor/Monitor.js';
import { Playback } from '/editors/vault/01-23-2026/src/monitor/Playback.js';

export class Game {
  constructor() {
    this.editor = null;
  }

  async initialize(params = {}) {
    this.params = {
      fontSize: 20,
      scale: 100,
      darkmode: false,
      correctColor: 'rgb(222, 205, 228)',
      incorrectColor: 'rgb(231, 186, 97)',
      backgroundColor: 'rgb(245, 237, 255)',
      pageColor:  'rgb(255, 255, 255)',
      primaryColor: 'rgb(25, 46, 19)',
      textColor: 'rgb(143, 15, 255)',
      initialState: null,
      continuousCheck: false,
      fuzzyAllowance: 2,
      constraint: 'Match First Line',
      ...params
    };

    this.settings = [
      { id: 'constraint', inBar: true, name: 'Constraint', type: 'select', description: '', options: ['Match First Line'] },
      { id: 'fontSize', inBar: true, name: 'Font Size', type: 'number', description: 'Font size for the editor text (px)' },
      { id: 'scale', inBar: true, name: 'Scale', default: 100, type: 'select', description: 'The editor scale (in percent)', options: [25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300] },
      { id: 'darkmode', inBar: true, name: 'Dark Mode', default: false, type: 'boolean', description: 'Toggle Dark Mode' },
      { id: 'correctColor', name: 'Correct Color', inBar: false, type: 'color', default: this.params.correctColor, description: 'Color of the correct words' },
      { id: 'incorrectColor', name: 'Incorrect Color', inBar: false, type: 'color', default: this.params.incorrectColor, description: 'Color of the incorrect words' },
      { id: 'backgroundColor', name: 'Background Color', short: " ", inBar: true, type: 'color', default: this.params.backgroundColor, description: 'Background Color' },
      { id: 'pageColor', name: 'Page Color', short: " ", inBar: true, type: 'color', default: this.params.pageColor, description: 'Page Color' },
      { id: 'primaryColor', name: 'Primary Color', short: " ", inBar: false, type: 'color', default: this.params.primaryColor, description: 'Primary Color' },
      { id: 'textColor', name: 'Text Color', short: " ", inBar: true, type: 'color', default: this.params.textColor, description: 'Text Color' },
    ]
    
    // Initialize basic text editor
    this.editor = document.getElementById('editor');
    if (!this.editor) {
      throw new Error('Editor element not found');
    }

    this.overlay = document.getElementById('overlay');
    if (!this.overlay) {
      throw new Error('Overlay element not found');
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

    // change window size listener
    window.addEventListener('resize', () => {
        // wait 
        setTimeout(() => {
          this.syncOverlay();
          this.onDocumentChange()
        }, 11);
      }
    );

    this.monitor = new Monitor(this.editor);
    this.monitor.on('token', (token) => this.onNewToken(token));
    this.monitor.on('keystroke', (keystroke) => this.handleInput(keystroke));

    // Set the overlay css to match most of the values of the editor
    this.syncOverlay();

    this._setupHoverTooltip();

    // To support backward's compatability, MetaGame expects game to have a .performance property
    // with certain functions: loadState, getAllSettings, should document better
    this.performance = this;
  }

  loadState(state) {
    this.editor.textContent = state.text;
  }

  setColors(isDark) {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  
    if (isDark) {
      document.documentElement.style.setProperty('--background-color', '#000000');
      document.documentElement.style.setProperty('--page-color', '#000000');
      document.documentElement.style.setProperty('--primary-color', '#ffffff');
      document.documentElement.style.setProperty('--text-color', '#ffffff');
    } else {
      document.documentElement.style.setProperty('--background-color', 'var(--default-background-color)');
      document.documentElement.style.setProperty('--page-color', 'var(--default-page-color)');
      document.documentElement.style.setProperty('--primary-color', 'var(--default-primary-color)');
      document.documentElement.style.setProperty('--text-color', 'var(--default-text-color)');
    }
  
  }

  onSettingChanged(name, value, oldValue) {
    if (name === 'fontSize') {
      document.documentElement.style.setProperty('--editor-font-size', `${value}px`);
      this.syncOverlay();
      this.onDocumentChange();
    } else if (name === 'scale') {
      this.setScale(value);
    } else if (name === 'darkmode') {
      this.setColors(value);
    } else if (name === 'correctColor') {
      document.documentElement.style.setProperty('--correct-color', value);
    } else if (name === 'incorrectColor') {
      document.documentElement.style.setProperty('--incorrect-color', value);
    } else if (name === 'backgroundColor') {
      document.documentElement.style.setProperty('--default-background-color', value);
    } else if (name === 'pageColor') {
      document.documentElement.style.setProperty('--default-page-color', value);
    } else if (name === 'primaryColor') {
      document.documentElement.style.setProperty('--default-primary-color', value);
    } else if (name === 'textColor') {
      document.documentElement.style.setProperty('--default-text-color', value);
    } else if (name === 'constraint') {
      if(value === 'Match First Line') {
      }
    }
  }

  setInitialSettings() {
    this.onSettingChanged('scale', this.params.scale, null);
    this.onSettingChanged('fontSize', this.params.fontSize, null);
    this.onSettingChanged('darkmode', this.params.darkmode, null);
    this.onSettingChanged('backgroundColor', this.params.backgroundColor, null);
    this.onSettingChanged('pageColor', this.params.pageColor, null);
    this.onSettingChanged('primaryColor', this.params.primaryColor, null);
    this.onSettingChanged('textColor', this.params.textColor, null);
    this.onSettingChanged('correctColor', this.params.correctColor, null);
    this.onSettingChanged('incorrectColor', this.params.incorrectColor, null);
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
    if (this.overlay && this.editor) {
      const editorRect = this.editor.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(this.editor);
      
      // Copy dimensions
      this.overlay.style.width = `${editorRect.width}px`;
      this.overlay.style.height = `${editorRect.height}px`;
      
      // Copy text styling (but not background)
      this.overlay.style.fontFamily = computedStyle.fontFamily;
      this.overlay.style.fontSize = computedStyle.fontSize;
      this.overlay.style.lineHeight = computedStyle.lineHeight;
      this.overlay.style.padding = computedStyle.padding;
      this.overlay.style.border = computedStyle.border;
      this.overlay.style.boxSizing = computedStyle.boxSizing;
      this.overlay.style.textAlign = computedStyle.textAlign;
      this.overlay.style.letterSpacing = computedStyle.letterSpacing;
      this.overlay.style.wordSpacing = computedStyle.wordSpacing;
    }
  }

  handleInput(keystroke) {
    // console.log('monitor.tokens', this.monitor.tokens);
    this.onDocumentChange();

  }

  onNewToken(token) {
    this.onDocumentChange();
  }

  onDocumentChange() {
    if (!this.overlay || !this.editor) return;

    this.overlay.querySelectorAll('.move').forEach(el => el.remove());

    const documentWords = iterateContentEditableWords(this.editor, { includeNewlines: true });

    let text = '';
    const lines = [];
    let current = { items: [], range: { start: 0, end: 0 } };
    for (const word of documentWords) {
      if (word.type === 'newline') {
        current.range.end = text.length;
        lines.push(current);
        text += '\n';
        current = { items: [], range: { start: text.length, end: text.length } };
      } else {
        if (current.items.length > 0) text += ' ';
        word.range = { start: text.length, end: text.length + word.text.length };
        text += word.text;
        current.items.push(word);
      }
    }
    current.range.end = text.length;
    lines.push(current);

    const allTerms = nlp(text).json({ offset: true }).flatMap(s => s.terms);

    let firstLineTerms = null;
    let nonEmptyLineCount = 0;
    let allSolved = true;
    for (const line of lines) {
      if (line.items.length === 0) continue;
      nonEmptyLineCount++;

      const lineTerms = allTerms.filter(t =>
        t.offset.start >= line.range.start && t.offset.start < line.range.end
      );

      if (firstLineTerms == null) {
        firstLineTerms = lineTerms;
        this.updateConstraint(firstLineTerms);
      }

      const {solved, matches} = this.isLineSolved(firstLineTerms, lineTerms);
      if (!solved) allSolved = false;

    // determine inidvidual word solved status
      const wordStatus = line.items.map(word => {
        if (!matches) return null;
        for (let i = 0; i < matches.length && i < lineTerms.length; i++) {
          const curTerm = lineTerms[i];
          if (curTerm.offset.start >= word.range.start && curTerm.offset.start < word.range.end) {
            word.term = curTerm;
            return matches[i] ? 'solved' : 'unsolved';
          }
        }
        return null;
      });

      this.highlight(line.items, wordStatus);
    }

    const submitContainer = document.getElementById('submit');
    if (submitContainer) {
      submitContainer.style.display = (nonEmptyLineCount >= 2 && allSolved) ? 'flex' : 'none';
    }
  }

  isLineSolved(targetLineTerms, actualLineTerms) {
    if(!targetLineTerms || !actualLineTerms) {
      return {solved: false, matches: []};
    }

    let matches = [];
    let maxLength = Math.max(targetLineTerms.length, actualLineTerms.length);
    for(let i = 0; i < maxLength; i ++) {
      let targetWord = targetLineTerms[i]?.text;
      let actualWord = actualLineTerms[i]?.text;
      let targetTags = targetLineTerms[i]?.tags || [];
      let actualTags = actualLineTerms[i]?.tags || [];
      
      let permissableTags = targetTags.slice(0, 2);
      // if any in permissableTags are in actualTags, set to true
      let isMatch = permissableTags.some(tag => actualTags?.includes(tag));
      // console.log("target", targetWord, "tags", targetTags, "matches", "actual", actualWord, actualTags, isMatch);
      matches.push(isMatch);
    }

    let solved = matches.every(match => match);
    return {solved, matches};
  }

  highlight(line, wordStatus) {
    for (let i = 0; i < line.length; i++) {
      const word = line[i];
      const status = wordStatus[i];
      if (!word.rect) console.log("no word", word);
      word.status = status;

      this.makeWord(word);
    }
  }

  makeWord(word) {
    const { text, rect, node, startIndex, endIndex, parent: editor, status } = word;

    const newElement = document.createElement('div');
    newElement.classList.add('move');
    newElement.textContent = text;
    const { left, top, width, height } = rect;

    newElement.style.left = `${left}px`;
    newElement.style.top = `${top}px`;
    newElement.classList.add(status);
    newElement._term = word.term;

    this.overlay.appendChild(newElement);
  }

  _setupHoverTooltip() {
    this._lastHovered = null;
    this._tagTooltip = document.createElement('div');
    this._tagTooltip.className = 'tag-tooltip';
    this._tagList = document.createElement('div');
    this._tagList.className = 'tag-list';
    this._tagTooltip.appendChild(this._tagList);
    document.body.appendChild(this._tagTooltip);

    this._mousemoveHandler = (e) => {
      const moves = this.overlay.querySelectorAll('.move');
      let target = null;
      for (const el of moves) {
        const r = el.getBoundingClientRect();
        if (e.clientX >= r.left && e.clientX <= r.right &&
            e.clientY >= r.top && e.clientY <= r.bottom) {
          target = el;
          break;
        }
      }
      if (target !== this._lastHovered) {
        if (this._lastHovered) {
          this._lastHovered.classList.remove('hovered');
          this._unhoveredWord();
        }
        if (target) {
          target.classList.add('hovered');
          this._hoveredWord(target);
        }
        this._lastHovered = target || null;
      }
      if (this._lastHovered) {
        this._tagTooltip.style.left = `${e.clientX + 12}px`;
        this._tagTooltip.style.top = `${e.clientY + 12}px`;
      }
    };
    document.addEventListener('mousemove', this._mousemoveHandler);
  }

  _hoveredWord(target) {
    const tags = target._term?.tags || [];
    this._tagList.innerHTML = "";
    for(const tag of tags) {
      this._tagList.innerHTML += `<div class="constraint-value">${tag}</div>`;
    }
    this._tagTooltip.style.display = tags.length > 0 ? 'block' : 'none';
  }

  _unhoveredWord() {
    this._tagTooltip.style.display = 'none';
  }

  updateConstraint(constraintTerms) {
    let termsElt = document.getElementById('constraint-terms');
    if(!termsElt) {
      return;
    }
    termsElt.innerHTML = "";
    for(const term of constraintTerms) {
      let newElement = document.createElement('div');

      newElement.innerHTML = `<div class='constraint-term'>
        <span class='constraint-label'>${term?.text}</span>
        <span class='constraint-value'>${term?.tags?.[0] || ""}</span>
      </div>`;
      termsElt.appendChild(newElement);
    }

    let titleElt = document.getElementById('constraint-title');
    if (titleElt) {
      titleElt.textContent = constraintTerms.length > 0 ? this.params.constraint : "";
    }

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

