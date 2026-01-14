export class Controls {
  constructor(options = {}) {
    this.game = options.game || null;
    this.save = options.save || null;
    this.documentId = options.documentId || null;
    this.onNewDocument = options.onNewDocument || null;
    this.onSave = options.onSave || null;
    this.templateLoaded = false;
  }

  async loadTemplate() {
    if (this.templateLoaded) return;
    
    try {
      const response = await fetch('controls.html');
      const html = await response.text();
      
      // Parse the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Extract and inject CSS
      const style = doc.querySelector('style');
      if (style) {
        document.head.appendChild(style.cloneNode(true));
      }
      
      // Store the template content
      const template = doc.querySelector('#controls-template');
      if (template) {
        this.templateHTML = template.innerHTML;
      }
      
      this.templateLoaded = true;
    } catch (error) {
      console.error('Failed to load controls template:', error);
    }
  }

  async initialize() {
    await this.loadTemplate();
    this.render();
    this.attachEventListeners();
    this.updateLastSavedDisplay();
  }

  render() {
    const controlsContainer = document.getElementById('controls');
    if (!controlsContainer) return;

    controlsContainer.innerHTML = this.templateHTML || '';
  }

  attachEventListeners() {
    const saveBtn = document.getElementById('save-btn');
    const downloadSaveBtn = document.getElementById('download-save-btn');
    const loadBtn = document.getElementById('load-btn');
    const newGameBtn = document.getElementById('new-game-btn');
    const fileInput = document.getElementById('file-input');
    const settingsBtn = document.getElementById('settings-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => this.handleSave());
    }

    if (downloadSaveBtn) {
      downloadSaveBtn.addEventListener('click', () => this.handleDownloadSave());
    }

    if (loadBtn) {
      loadBtn.addEventListener('click', () => this.handleLoad());
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
  }

  handleSave() {
    if (!this.game || !this.save || !this.documentId) return;

    const state = this.game.saveState();
    if (!state) return;

    const document = this.save.getDocument(this.documentId);
    if (document) {
      document.setField('content', state.text);
      document.setField('lastModified', new Date().toISOString());
      this.save.setMetadata('dateModified', new Date().toISOString());
      this.save.saveToLocalStorage();
      this.updateLastSavedDisplay();
    }

    if (this.onSave) {
      this.onSave();
    }
  }

  handleDownloadSave() {
    if (!this.save) return;
    this.save.downloadSave();
  }

  handleLoad() {
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
    save.setMetadata('currentDocumentId', documentId);
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

  showSettings() {
    const settings = this.game.performance.getAllSettings();
    
    const modal = document.createElement('div');
    modal.className = 'document-selector-modal';
    
    const content = document.createElement('div');
    content.className = 'document-selector-content';
    
    const title = document.createElement('div');
    title.className = 'settings-title';
    title.textContent = 'Settings';
    content.appendChild(title);
    
    Object.values(settings).forEach(setting => {
      const settingDiv = document.createElement('div');
      settingDiv.className = 'setting-item';
      
      if (setting.description) {
        settingDiv.setAttribute('data-tooltip', setting.description);
      }
      
      const label = document.createElement('label');
      label.className = 'setting-label';
      label.textContent = setting.name;
      settingDiv.appendChild(label);
      
      if (setting.type === 'boolean') {
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = setting.value;
        checkbox.addEventListener('change', () => {
          this.game.performance.updateSetting(setting.name, checkbox.checked);
        });
        settingDiv.appendChild(checkbox);
      } else if (setting.type === 'number') {
        const input = document.createElement('input');
        input.type = 'number';
        input.value = setting.value;
        input.className = 'setting-input';
        input.addEventListener('change', () => {
          this.game.performance.updateSetting(setting.name, parseFloat(input.value));
        });
        settingDiv.appendChild(input);
      } else if (setting.type === 'select') {
        const select = document.createElement('select');
        select.className = 'setting-input';
        setting.options.forEach(option => {
          const optionEl = document.createElement('option');
          optionEl.value = option;
          optionEl.textContent = option;
          select.appendChild(optionEl);
        });
        select.value = setting.value;
        select.addEventListener('change', () => {
          this.game.performance.updateSetting(setting.name, select.value);
        });
        settingDiv.appendChild(select);
      } else {
        const input = document.createElement('input');
        input.type = 'text';
        input.value = setting.value;
        input.className = 'setting-input';
        input.addEventListener('change', () => {
          this.game.performance.updateSetting(setting.name, input.value);
        });
        settingDiv.appendChild(input);
      }
      
      content.appendChild(settingDiv);
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
