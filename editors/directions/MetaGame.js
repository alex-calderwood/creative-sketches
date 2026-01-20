/**
 * MetaGame - Manages progression system (prompts, submit, modal) and coordinates with controls
 * Only shows progression elements if save exists in localStorage and direction matches editor
 */

import { MetaGameControls } from './MetaGameControls.js';
import { GameplaySave } from './GameplaySave.js';
import { Directions } from './Directions.js';
import { Document } from './Document.js';

export class MetaGame {
  constructor(projectId) {
    this.projectId = projectId;
    this.templateLoaded = false;
    this.modalHTML = null;
    this.controls = null;
    this.game = null;
    this.save = null;
    this.documentId = null;
    this.subdirection = null;
    this.subdirectionKey = null;
    this.directionName = null;
    this.progression = null;
    this.allSubdirections = null;
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
    
    // Load directions to get initial state
    const directions = await Directions.fromFile('/editors/directions/directions.json');
    this.subdirection = this.findSubdirectionForEditor(directions);
    
    // Don't auto-load - user can use Load button to select a document
    // Just create a new document for this session
    this.documentId = this.createNewDocument(this.save, this.subdirection);
    this.save.saveToLocalStorage();
    
    // Load progression prompts
    await this.loadTemplate();
    await this.loadAndDisplayPrompts();
    
    //  initialize game with save and document (after prompt is displayed)
    await this.game.initialize({ save: this.save, documentId: this.documentId });

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

  createNewDocument(save, subdirection = null) {
    const documentId = `doc_${Date.now()}`;
    
    // Get initial content from subdirection and convert to state format
    let initialContent = '';
    if (subdirection?.['initial-state']) {
      // Convert initial-state to proper state object format
      const stateObj = subdirection['initial-state'];
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

  findSubdirectionForEditor(directions) {
    for (const directionName of directions.getDirectionNames()) {
      const directionData = directions.data[directionName];
      const subdirections = directions.getSubdirections(directionName);
      
      for (const [key, subdirection] of Object.entries(subdirections)) {
        if (subdirection.editor === this.projectId) {
          // Store everything we need for progression
          this.directionName = directionName;
          this.subdirectionKey = key;
          this.progression = directionData.progression || [];
          this.allSubdirections = subdirections;
          return subdirection;
        }
      }
    }
    return null;
  }

  logLoadedComponents() {
    const components = {
      Controls: this.loaded.controls,
      Prompts: this.loaded.prompts,
      Submit: this.loaded.submit,
      InitialState: this.subdirection?.['initial-state'],
      Autosave: this.game
    };
    
    const loaded = Object.keys(components).filter(k => components[k]).join(', ') || 'None';
    const notLoadedList = Object.keys(components).filter(k => !components[k]);
    
    const directionInfo = this.directionName && this.subdirectionKey 
      ? ` | Direction: ${this.directionName}/${this.subdirectionKey}` 
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
    const newDocumentId = this.createNewDocument(this.save, this.subdirection);
    this.save.saveToLocalStorage();
    console.log("new document", newDocumentId);
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
        const subdirections = directions.getSubdirections(directionName);
        const subdirection = Object.values(subdirections).find(sub => sub.editor === this.projectId);
        
        if (subdirection?.prompt) {
          this.populatePromptDisplay(subdirection.prompt);
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
    // Save the current state
    if (this.game && this.save && this.documentId) {
      const state = await this.game.saveState();
      if (state) {
        const doc = this.save.getDocument(this.documentId);
        if (doc) {
          doc.setField('content', JSON.stringify(state));
          doc.setField('lastModified', new Date().toISOString());
          this.save.saveToLocalStorage();
        }
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
    
    // Apply replacements from subdirection if available
    if (this.subdirection?.replacements) {
      Object.entries(this.subdirection.replacements).forEach(([from, to]) => {
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
    // Mark current subdirection as completed
    if (this.save && this.subdirectionKey) {
      const completedSubdirections = this.save.getMetadata('completedSubdirections') || [];
      if (!completedSubdirections.includes(this.subdirectionKey)) {
        completedSubdirections.push(this.subdirectionKey);
        this.save.setMetadata('completedSubdirections', completedSubdirections);
        this.save.saveToLocalStorage();
      }
    }
    
    // Find next editor in progression
    const nextEditor = this.findNextEditor();
    
    if (nextEditor) {
      window.location.href = `/editors/${nextEditor}/`;
    } else {
      alert('You have completed the progression!');
      const modal = document.getElementById('complete-modal');
      if (modal) {
        modal.style.display = 'none';
      }
    }
  }

  findNextEditor() {
    if (!this.progression || !this.subdirectionKey || !this.allSubdirections) {
      return null;
    }
    
    // Find current position in progression
    const currentIndex = this.progression.indexOf(this.subdirectionKey);
    
    if (currentIndex === -1 || currentIndex >= this.progression.length - 1) {
      return null; // Last in progression or not found
    }
    
    // Get next subdirection
    const nextKey = this.progression[currentIndex + 1];
    const nextSubdirection = this.allSubdirections[nextKey];
    
    return nextSubdirection?.editor || null;
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
