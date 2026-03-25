import { saveStateWithImage } from './utils/utils.js';
import { GameplaySave } from '/editors/drifts/GameplaySave.js';
import { Modal } from '/editors/vault/01-23-2026/src/components/Modal.js';

export class MetaGameControls {
  constructor(params = {}) {
    this.projectId = params.projectId || null;
    this.projectName = params.projectName || null;
    this.backLink = params.backLink || null;
    this.game = params.game || null;
    this.save = params.save || null;
    this.documentId = params.documentId || null;
    this.onNewDocument = params.onNewDocument || null;
    this.instructions = params.instructions || null;
    this.onSave = params.onSave || null;
    this.templateLoaded = false;

    this.modal = null;
    this.settingsBarLoaded = false;
    this.useSettingsBar = params.useSettingsBar !== false;
  
  }

  async loadTemplate() {
    if (this.templateLoaded) return;
    
    try {
      const response = await fetch('/editors/drifts/MetaGameControls.html');
      const html = await response.text();
      
      // Parse the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Extract and inject CSS
      const style = doc.querySelector('style');
      if (style) {
        document.head.appendChild(style.cloneNode(true));
      }

      const gameBanner = doc.querySelector('#game-banner');
      if (gameBanner) {
        this.gameBannerHTML = gameBanner.innerHTML;
      }

      this.templateLoaded = true;

    } catch (error) {
      console.error('Failed to load controls template:', error);
    }
  }

  async initialize() {
    await this.loadTemplate();
    this.render();
    this.renderSettingsBar();
    this.createModal();
    await this.loadInstructions();

    this.attachEventListeners();
    this.updateLastSavedDisplay();
  }

  render() {
    const gameBanner = document.getElementById('game-banner');
    if (gameBanner) {
      gameBanner.innerHTML = this.gameBannerHTML || '';
      let subtitle = document.querySelector('.subtitle');
      if (subtitle) {
        subtitle.textContent = this.projectName;
      }
      let backLink = document.getElementById('back-link');
      if (backLink) {
        backLink.href = this.backLink.href;
        backLink.textContent = this.backLink.text;
      }

      if(this.save) {
        this.unhideSaveRealtedButtons();
      }

      let settingsBar = document.getElementById('settings-bar');
      if (!settingsBar) {
        settingsBar = document.createElement('div');
        settingsBar.id = 'settings-bar';
        gameBanner.insertAdjacentElement('afterend', settingsBar);
      }
    }
  }

  unhideSaveRealtedButtons() {
    let saveButtons = document.querySelectorAll('.save-related');
    for(let button of saveButtons) {
      button.style.display = 'block';
    }
  }

  attachEventListeners() {
    const saveBtn = document.getElementById('save-btn');
    const downloadBtn = document.getElementById('download-btn');
    const loadBtn = document.getElementById('load-btn');
    const uploadBtn = document.getElementById('upload-btn');
    const newGameBtn = document.getElementById('new-game-btn');
    const instructionsBtn = document.getElementById('instructions-btn');
    const fileInput = document.getElementById('file-input');
    const settingsBtn = document.getElementById('settings-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.handleSave());
    }

    if (downloadBtn) {
      downloadBtn.addEventListener('click', () => this.handleDownloadSave());
    }

    if (loadBtn) {
      loadBtn.addEventListener('click', () => this.handleLoadFromLocalStorage());
    }

    if (uploadBtn) {
      uploadBtn.addEventListener('click', () => this.handleUpload());
    }

    if (newGameBtn) {
      newGameBtn.addEventListener('click', () => this.handleNewDocument());
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileSelected(e));
    }

    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => this.showSettings());
    }

    if (instructionsBtn) {
      instructionsBtn.addEventListener('click', () => this.showInstructions());
    }
  }

  async handleSave() {
    if (!this.game || !this.save || !this.documentId) return;

    const state = this.game.saveState();
    if (!state) return;

    // Use shared helper to save state with image
    await saveStateWithImage(state, this.save, this.documentId);
    this.updateLastSavedDisplay();

    if (this.onSave) {
      this.onSave();
    }
  }

  handleDownloadSave() {
    if (!this.save) return;
    this.save.downloadSave();
  }

  handleLoadFromLocalStorage() {
    if (!this.save) {
      alert('No save data in local storage');
      return;
    }
    this.showDocumentSelector(this.save);
  }

  handleUpload() {
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
      fileInput.click();
    }
  }

  async handleFileSelected(e) {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const loadedSave = await GameplaySave.loadFromFile(file);
      this.showDocumentSelector(loadedSave);
    } catch (error) {
      console.error('Error loading save file:', error);
      alert('Error loading save file: ' + error.message);
    }

    // Reset file input
    e.target.value = '';
  }

  showDocumentSelector(loadedSave) {
    const documents = loadedSave.getAllDocuments();
    
    if (documents.length === 0) {
      alert('No documents found in save file');
      return;
    }

    // Sort by lastModified (most recent first)
    documents.sort((a, b) => {
      const aTime = a.getField('lastModified') || a.getField('createdAt');
      const bTime = b.getField('lastModified') || b.getField('createdAt');
      return new Date(bTime) - new Date(aTime);
    });

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'document-selector-modal';
    
    const content = document.createElement('div');
    content.className = 'document-selector-content';
    
    const title = document.createElement('div');
    title.textContent = 'Select a document';
    content.appendChild(title);
    
    documents.forEach(doc => {
      const item = document.createElement('div');
      item.className = 'document-list-item';
      
      const docId = document.createElement('div');
      docId.className = 'doc-id';
      docId.textContent = doc.id;
      
      const docCreated = document.createElement('div');
      docCreated.className = 'doc-created';
      const createdAt = doc.getField('createdAt');
      if (createdAt) {
        docCreated.textContent = `Created: ${new Date(createdAt).toLocaleString()}`;
      }
      
      item.appendChild(docId);
      item.appendChild(docCreated);
      item.addEventListener('click', () => {
        this.loadSaveWithDocument(loadedSave, doc.id);
        modal.remove();
      });
      
      content.appendChild(item);
    });
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'control-btn cancel-btn';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => modal.remove());
    content.appendChild(cancelBtn);
    
    modal.appendChild(content);
    document.body.appendChild(modal);
  }

  loadSaveWithDocument(save, documentId) {
    save.setMetadata('dateModified', new Date().toISOString());
    save.saveToLocalStorage();
    
    // Refresh to load the selected document
    window.location.reload();
  }

  handleNewDocument() {
    if (this.onNewDocument) {
      this.onNewDocument();
    }
  }

  updateLastSavedDisplay() {
    const lastSavedElement = document.getElementById('last-saved');
    const documentIdElement = document.getElementById('document-id');
    
    if (!lastSavedElement || !this.save) return;

    const dateModified = this.save.getMetadata('dateModified');
    if (dateModified) {
      const date = new Date(dateModified);
      lastSavedElement.textContent = `Last saved: ${date.toLocaleString()}`;
    }

    if (documentIdElement && this.documentId) {
      const doc = this.save.getDocument(this.documentId);
      const title = doc?.getField('title') || this.documentId;
      documentIdElement.textContent = ` ${title}`;
    }
  }

  updateGame(game) {
    this.game = game;
  }

  updateSave(save) {
    this.save = save;
    this.updateLastSavedDisplay();
  }

  updateDocumentId(documentId) {
    this.documentId = documentId;
    this.updateLastSavedDisplay();
  }

  loadInstructions() {
    if (!this.instructions) {
      let elt = document.querySelector('#instruction-text');
      if (elt) {
        this.instructions = elt.innerHTML;
      };
    }
    if (this.instructions) {
      let btn = document.getElementById('instructions-btn');
      if (btn) {
        btn.style.display = 'block';
      }
    }
  }

  showInstructions() {
    if (this.instructions) {
        const content = '<h1>Instructions</h1>' + this.instructions ;
        this.modal.show(content);
    }
  }

  async createModal() {
    this.modal = new Modal('complete-modal');
    await this.modal.create();
  }

  showTooltip(el, text) {
    if (!this._tooltip) {
      this._tooltip = document.createElement('div');
      this._tooltip.className = 'setting-tooltip';
      document.body.appendChild(this._tooltip);
    }
    const rect = el.getBoundingClientRect();
    this._tooltip.textContent = text;
    this._tooltip.style.left = rect.left + 'px';
    this._tooltip.style.top = (rect.bottom + 10) + 'px';
    this._tooltip.style.display = 'block';
  }

  hideTooltip() {
    if (this._tooltip) this._tooltip.style.display = 'none';
  }

  createSettingElement(setting) {
    const id = setting.id || setting.name;
    const name = setting.name || setting.id;

    const settingDiv = document.createElement('div');
    settingDiv.className = 'setting-item';

    if (setting.description) {
      settingDiv.addEventListener('mouseenter', (e) => this.showTooltip(e.currentTarget, setting.description));
      settingDiv.addEventListener('mouseleave', () => this.hideTooltip());
    }

    const label = document.createElement('label');
    label.className = 'setting-label';
    label.textContent = name;
    settingDiv.appendChild(label);

    if (setting.type === 'boolean') {
      const toggle = document.createElement('span');
      toggle.className = 'setting-toggle' + (setting.value ? ' on' : '');
      toggle.textContent = setting.value ? 'on' : 'off';
      toggle.addEventListener('click', () => {
        const isOn = toggle.classList.toggle('on');
        toggle.textContent = isOn ? 'on' : 'off';
        this.game.performance.updateSetting(id, isOn);
      });
      settingDiv.appendChild(toggle);
    } else if (setting.type === 'number') {
      const input = document.createElement('input');
      input.type = 'number';
      input.value = setting.value;
      input.className = 'setting-input';
      input.addEventListener('change', () => {
        this.game.performance.updateSetting(id, parseFloat(input.value));
      });
      settingDiv.appendChild(input);
    } else if (setting.type === 'select') {
      const select = document.createElement('select');
      select.className = 'setting-input';
      setting.options.forEach(option => {
        const optionEl = document.createElement('option');
        const isObj = typeof option === 'object';
        optionEl.value = isObj ? option.value : option;
        optionEl.textContent = isObj ? option.label : option;
        select.appendChild(optionEl);
      });
      select.value = setting.value;
      select.addEventListener('change', () => {
        this.game.performance.updateSetting(id, select.value);
      });
      settingDiv.appendChild(select);
    } else {
      const input = document.createElement('input');
      input.type = 'text';
      input.value = setting.value;
      input.className = 'setting-input';
      input.addEventListener('change', () => {
        this.game.performance.updateSetting(id, input.value);
      });
      settingDiv.appendChild(input);
    }

    return settingDiv;
  }

  renderSettingsBar() {
    if (!this.useSettingsBar) return;

    const settingsBar = document.getElementById('settings-bar');
    if (!settingsBar || !this.game?.performance) return;

    const settings = this.game.performance.getAllSettings();
    const barSettings = Object.values(settings).filter(s => s.inBar);
    if (barSettings.length === 0) return;

    settingsBar.innerHTML = '';
    barSettings.forEach(setting => {
      settingsBar.appendChild(this.createSettingElement(setting));
    });

    settingsBar.style.display = 'flex';
    this.settingsBarLoaded = true;
  }

  showSettings() {
    if (!this.game?.performance) return;

    const settings = this.game.performance.getAllSettings();
    const allSettings = Object.values(settings);
    if (allSettings.length === 0) return;
    

    const modal = document.createElement('div');
    modal.className = 'document-selector-modal';

    const content = document.createElement('div');
    content.className = 'document-selector-content';

    const title = document.createElement('div');
    title.className = 'settings-title';
    title.textContent = 'Settings';
    content.appendChild(title);

    // sort to show the ones that don't occur in the bar first
    allSettings.sort((a, b) => {
      return a.inBar ? 1 : -1;
    });
    
    allSettings.forEach(setting => {
      content.appendChild(this.createSettingElement(setting));
    });

    const closeBtn = document.createElement('button');
    closeBtn.className = 'control-btn cancel-btn';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', () => modal.remove());
    content.appendChild(closeBtn);

    modal.appendChild(content);
    document.body.appendChild(modal);
  }
}
