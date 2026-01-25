/**
 * MetaGame - Manages progression system (prompts, submit, modal) and coordinates with controls
 * Only shows progression elements if save exists in localStorage and direction matches editor
 */

import { MetaGameControls } from '/editors/directions/MetaGameControls.js';
import { GameplaySave } from '/editors/directions/GameplaySave.js';
import { Directions } from '/editors/directions/Directions.js';
import { Document } from '/editors/directions/Document.js'
import { saveStateWithImage } from '/editors/directions/utils/utils.js';

export class MetaGame {
  constructor(projectId) {
    this.projectId = projectId;
    this.templateLoaded = false;
    this.modalHTML = null;
    this.controls = null;
    this.game = null;
    this.save = null;
    this.documentId = null;
    this.level = null;
    this.levelKey = null;
    this.directionName = null;
    this.progression = null;
    this.allLevels = null;
    this.loaded = {
      controls: false,
      prompts: false,
      submit: false
    };
  }

  /**
   * Initialize the meta game system
   * @param {Object} game - The game instance (not yet initialized)
   */
  async initialize(game) {
    // If no save exists, skip MetaGame and just run game standalone
    if (!GameplaySave.hasLocalStorage()) {
      await game.initialize();
      return;
    }
    
    this.game = game;
    this.save = this.loadSave();

    this.directionName = this?.save?.getSelectedDirection();

    if (!this.directionName) {
      console.error('No selected direction', this);
      return;
    }
    
    // Load directions to get initial state
    const directions = await Directions.fromFile('/editors/directions/directions.json');
    this.level = this.findLevelForEditor(this.directionName, directions);


    // Check if there is a current document id and it matches this editor
    if (this.save.getSelectedDocumentId()) {
      let documentId = this.save.getSelectedDocumentId();
      // check that the document is of the same level
      let doc = this.save.getDocument(documentId);
      if (doc && doc.getField('sourceEditor') === this.projectId) {
        this.documentId = documentId;
      }
    }

    if (!this.documentId) {
      this.documentId = this.createNewDocument(this.save, this.level);
      console.log('MetaGame.initialize() no selected document id, created new document', this.documentId);
      this.save.saveToLocalStorage();
    }
    
    // Load progression prompts
    await this.loadTemplate();
    await this.loadAndDisplayPrompts();
    
    //  initialize game with save and document (after prompt is displayed)
    await this.game.initialize({ 
      save: this.save, 
      documentId: this.documentId,
      level: this.level
    });

    // Initialize controls
    this.controls = new MetaGameControls({
      game: this.game,
      save: this.save,
      documentId: this.documentId,
      onNewDocument: () => this.handleNewDocument()
    });

    await this.controls.initialize();
    this.loaded.controls = this.controls?.templateLoaded,
    
    // Setup autosave
    this.setupAutosave();
    
    // Log what was loaded
    this.logLoadedComponents();
  }

  loadSave() {
    // Only load if exists (don't create)
    if (GameplaySave.hasLocalStorage()) {
      return GameplaySave.fromLocalStorage();
    }
    return null;
  }

  createNewDocument(save, level = null) {
    const documentId = `doc_${Date.now()}`;
    
    // Get initial content from level and convert to state format
    let initialContent = '';
    if (level?.['initial-state']) {
      // Convert initial-state to proper state object format
      const stateObj = level['initial-state'];
      initialContent = JSON.stringify(stateObj);
    }
    
    const document = new Document(documentId, {
      createdAt: new Date().toISOString(),
      content: initialContent,
      sourceEditor: this.projectId,
      title: 'Untitled'
    });
    save.addDocument(document);
    save.setMetadata('dateModified', new Date().toISOString());
    return documentId;
  }

  findLevelForEditor(directionName, directions) {
    const directionData = directions.data[directionName];
    const levels = directions.getLevels(directionName);

    for (const [key, level] of Object.entries(levels)) {
      if (level.editor === this.projectId) {
        // Store everything we need for progression
        this.directionName = directionName;
        this.levelKey = key;
        this.progression = directionData.progression || [];
        this.allLevels = levels;
        return level;
      }
    }
    console.error('No level found for direction', directionName, this);
    return null;
  }

  logLoadedComponents() {
    const components = {
      Controls: this.loaded.controls,
      Prompts: this.loaded.prompts,
      Submit: this.loaded.submit,
      InitialState: this.level?.['initial-state'],
      Autosave: this.game
    };
    
    const loaded = Object.keys(components).filter(k => components[k]).join(', ') || 'None';
    const notLoadedList = Object.keys(components).filter(k => !components[k]);
    
    const directionInfo = this.directionName && this.levelKey 
      ? ` | Direction: ${this.directionName}/${this.levelKey}` 
      : '';
    console.log(`MetaGame [${this.projectId}] Doc: ${this.documentId || 'none'}${directionInfo}`);
    console.log(`  Loaded: ${loaded}`);
    if (notLoadedList.length > 0) {
      console.log(`  Not loaded: ${notLoadedList.join(', ')}`);
    }
  }

  findLatestDocumentForEditor() {
    if (!this.save) return null;
    
    const documents = this.save.getAllDocuments();
    const editorDocs = documents.filter(doc => 
      doc.getField('sourceEditor') === this.projectId
    );
    
    if (editorDocs.length === 0) return null;
    
    // Sort by lastModified or createdAt, most recent first
    editorDocs.sort((a, b) => {
      const aTime = a.getField('lastModified') || a.getField('createdAt');
      const bTime = b.getField('lastModified') || b.getField('createdAt');
      return new Date(bTime) - new Date(aTime);
    });
    
    return editorDocs[0].id;
  }

  handleNewDocument() {
    const newDocumentId = this.createNewDocument(this.save, this.level);
    this.save.setMetadata('selectedDocumentId', newDocumentId);

    this.save.saveToLocalStorage();
    window.location.reload();
  }

  setupAutosave() {
    const editor = document.getElementById('editor');
    if (editor) {
      editor.addEventListener('input', () => {
        this.autoSave();
      });
    }
  }

  autoSave() {
    if (!this.save || !this.game) return;
    
    const state = this.game.saveState();
    if (!state) return;
    
    const document = this.save.getDocument(this.documentId);
    if (document) {
      document.setField('content', JSON.stringify(state));
      document.setField('lastModified', new Date().toISOString());
      this.save.setMetadata('dateModified', new Date().toISOString());
      this.save.saveToLocalStorage();
    }
  }

  async loadTemplate() {
    if (this.templateLoaded) return;
    
    try {
      const response = await fetch('/editors/directions/MetaGame.html');
      const html = await response.text();
      
      // Parse the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Extract and inject CSS
      const style = doc.querySelector('style');
      if (style) {
        document.head.appendChild(style.cloneNode(true));
      }
      
      // Store the modal template
      const template = doc.querySelector('#modal-template');
      if (template) {
        this.modalHTML = template.innerHTML;
      }
      
      this.templateLoaded = true;
    } catch (error) {
      console.error('Failed to load MetaGame template:', error);
    }
  }

  async loadAndDisplayPrompts() {
    try {
      const directions = await Directions.fromFile('/editors/directions/directions.json');
      
      for (const directionName of directions.getDirectionNames()) {
        const levels = directions.getLevels(directionName);
        const level = Object.values(levels).find(sub => sub.editor === this.projectId);
        
        if (level?.prompt) {
          this.populatePromptDisplay(level.prompt);
          this.populateSubmitButton();
          this.createModal();
          return;
        }
      }
    } catch (error) {
      console.error('Error loading prompts:', error);
    }
  }

  populatePromptDisplay(promptHtml) {
    // some editors have a prompt-container
    const promptContainer = document.getElementById('prompt-container');
    if (promptContainer) {
      promptContainer.style.display = 'flex';
    }

    const promptDisplay = document.getElementById('prompt-display');
    if (promptDisplay) {
      promptDisplay.innerHTML = promptHtml;
      promptDisplay.style.display = 'block';
      this.loaded.prompts = true;
    }
  }

  populateSubmitButton() {
    const submitContainer = document.getElementById('submit');
    if (submitContainer) {
      submitContainer.innerHTML = '<button id="submit-button">Submit</button>';
      submitContainer.style.display = 'flex';
      this.loaded.submit = true;
      
      // Attach submit button event listener
      const submitButton = document.getElementById('submit-button');
      if (submitButton) {
        submitButton.addEventListener('click', () => this.handleSubmit());
      }
    }
  }

  createModal() {
    if (this.modalHTML) {
      document.body.insertAdjacentHTML('beforeend', this.modalHTML);
      
      // Attach modal event listeners
      const modalCancel = document.getElementById('modal-cancel');
      const modalContinue = document.getElementById('modal-continue');
      
      if (modalCancel) {
        modalCancel.addEventListener('click', () => this.handleModalCancel());
      }
      
      if (modalContinue) {
        modalContinue.addEventListener('click', () => this.handleModalContinue());
      }
    }
  }

  async handleSubmit() {
    // Save the current state with image
    if (this.game && this.save && this.documentId) {
      const state = await this.game.saveState();
      if (state) {
        await saveStateWithImage(state, this.save, this.documentId);
      }
    }
    
    // Show the modal
    const modal = document.getElementById('complete-modal');
    if (modal) {
      // Get the alternate text (processed version)
      const alternateText = await this.getAlternateText();
      const alternateTextElement = document.getElementById('alternate-text');
      if (alternateTextElement && alternateText) {
        alternateTextElement.textContent = alternateText;
      }
      
      modal.style.display = 'flex';
    }
  }

  async getAlternateText() {
    // Get the current state text
    if (!this.game) return '';
    
    const state = await this.game.saveState();
    let text = state?.text || '';
    
    // Apply replacements from level if available
    if (this.level?.replacements) {
      Object.entries(this.level.replacements).forEach(([from, to]) => {
        const regex = new RegExp(`\\b${from}\\b`, 'gi');
        text = text.replace(regex, to);
      });
    }
    
    return text;
  }

  handleModalCancel() {
    const modal = document.getElementById('complete-modal');
    if (modal) {
      modal.style.display = 'none';
    }
  }

  async handleModalContinue() {
    // Mark current level as completed
    if (this.save && this.levelKey) {
      const completedLevels = this.save.getMetadata('completedLevels') || [];
      if (!completedLevels.includes(this.levelKey)) {
        completedLevels.push(this.levelKey);
        this.save.setMetadata('completedLevels', completedLevels);
        this.save.saveToLocalStorage();
      }
    }
    
    // Navigate to landing page
    window.location.href = '/editors/directions/';
  }

  findNextEditor() {
    if (!this.progression || !this.levelKey || !this.allLevels) {
      return null;
    }
    
    // Find current position in progression
    const currentIndex = this.progression.indexOf(this.levelKey);
    
    if (currentIndex === -1 || currentIndex >= this.progression.length - 1) {
      return null; // Last in progression or not found
    }
    
    // Get next level
    const nextKey = this.progression[currentIndex + 1];
    const nextLevel = this.allLevels[nextKey];
    
    return nextLevel?.editor || null;
  }

  /**
   * Update the game instance in controls
   */
  updateGame(game) {
    if (this.controls) {
      this.controls.updateGame(game);
    }
  }

  /**
   * Update the save instance in controls
   */
  updateSave(save) {
    if (this.controls) {
      this.controls.updateSave(save);
    }
  }

  /**
   * Update the document ID in controls
   */
  updateDocumentId(documentId) {
    if (this.controls) {
      this.controls.updateDocumentId(documentId);
    }
  }
}
