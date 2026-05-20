import { Monitor } from '/editors/vault/01-23-2026/src/monitor/Monitor.js';
import { ShaderLayer } from './shader.js';

export class Game {
  constructor() {
    this.editor = null;
    this.shaderLayer = null;
  }

  async initialize(params = {}) {
    this.params = {
      fontSize: 25,
      scale: 100,
      darkmode: false,
      hoverColor: 'rgb(255, 246, 179)',
      backgroundColor: 'rgb(255, 255, 255)',
      pageColor: 'rgb(255, 255, 255)',
      primaryColor: 'rgb(0, 0, 0)',
      textColor: 'rgb(0, 0, 0)',
      initialState: null,
      continuousCheck: false,
      ...params
    };

    this.settings = [
      { id: 'fontSize', inBar: true, name: 'Font Size', type: 'number', description: 'Font size for the editor text (px)' },
      { id: 'scale', inBar: true, name: 'Scale', default: 100, type: 'select', description: 'The editor scale (in percent)', options: [25, 50, 75, 100, 125, 150, 175, 200, 225, 250, 275, 300] },
      { id: 'darkmode', inBar: true, name: 'Dark Mode', default: false, type: 'boolean', description: 'Dark mode for the editor' },
      { id: 'hoverColor', name: 'Highlight Color', inBar: false, type: 'color', default: this.params.hoverColor, description: 'Color of the highlight on every Nth word' },
      { id: 'backgroundColor', name: 'Background Color', short: " ", inBar: true, type: 'color', default: this.params.backgroundColor, description: 'Background Color' },
      { id: 'pageColor', name: 'Page Color', short: " ", inBar: true, type: 'color', default: this.params.pageColor, description: 'Page Color' },
      { id: 'primaryColor', name: 'Primary Color', short: " ", inBar: false, type: 'color', default: this.params.primaryColor, description: 'Primary Color' },
      { id: 'textColor', name: 'Text Color', short: " ", inBar: false, type: 'color', default: this.params.textColor, description: 'Text Color' },
    ];

    this.editor = document.getElementById('editor');
    if (!this.editor) throw new Error('Editor element not found');

    this.containerHeight = this.getContainerHeight();
    this.setInitialSettings();

    if (this.params.initialState) {
      this.loadState(this.params.initialState);
    }

    this.editor.addEventListener('input', this.handleInput.bind(this));

    this.monitor = new Monitor(this.editor);
    this.monitor.on('keystroke', (keystroke) => this.handleInput(keystroke));

    const container = document.getElementById('shader-area');
    this.shaderLayer = new ShaderLayer(container, this.editor);
    this.shaderLayer.start();

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
      this.editor.style.fontSize = `${value}px`;
    } else if (name === 'scale') {
      this.setScale(value);
    } else if (name === 'darkmode') {
      this.setColors(value);
    } else if (name === 'hoverColor') {
      document.documentElement.style.setProperty('--default-hover-color', value);
    } else if (name === 'backgroundColor') {
      document.documentElement.style.setProperty('--default-background-color', value);
    } else if (name === 'pageColor') {
      document.documentElement.style.setProperty('--default-page-color', value);
    } else if (name === 'primaryColor') {
      document.documentElement.style.setProperty('--default-primary-color', value);
    } else if (name === 'textColor') {
      document.documentElement.style.setProperty('--default-text-color', value);
    }
  }

  setInitialSettings() {
    this.onSettingChanged('scale', this.params.scale, null);
    this.onSettingChanged('fontSize', this.params.fontSize, null);
    this.onSettingChanged('darkmode', this.params.darkmode, null);
    this.onSettingChanged('hoverColor', this.params.hoverColor, null);
    this.onSettingChanged('backgroundColor', this.params.backgroundColor, null);
    this.onSettingChanged('pageColor', this.params.pageColor, null);
  }

  getContainerHeight() {
    const gameBanner = document.getElementById('game-banner');
    if (gameBanner) return window.innerHeight - gameBanner.clientHeight;
    throw new Error('getContainerHeight: could not compute nominal height');
  }

  setScale(percent) {
    const height = this.containerHeight * percent / 100;
    const editorContainer = document.getElementById('editor-container');
    if (editorContainer) {
      document.documentElement.style.setProperty('--editor-height', `${height}px`);
    }
  }

  saveState() {
    if (!this.editor) return null;
    return { text: this.editor.textContent || '' };
  }

  handleInput(keystroke) {}

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
