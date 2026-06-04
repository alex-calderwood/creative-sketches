/**
 * MetaGame - Manages progression system (prompts, submit, modal) and coordinates with controls
 * Only shows progression elements if save exists in localStorage and drift matches editor
 */

import { MetaGameControls } from '/editors/drifts/MetaGameControls.js';
import { GameplaySave } from '/editors/drifts/GameplaySave.js';
import { Drifts } from '/editors/drifts/Drifts.js';
import { Document } from '/editors/drifts/Document.js'
import { Modal } from '/editors/vault/01-23-2026/src/components/Modal.js';
import { saveStateWithImage, setChosenDocumentForLevel, getChosenDocumentForLevel} from '/editors/drifts/utils/utils.js';
import { getText, joinText, putText } from '/editors/drifts/ContentQuery.js';

export class MetaGame {
  constructor(projectId, projectName, params = {}) {
    this.projectId = projectId;
    this.projectName = projectName;
    this.description = params.description || null;
    this.options = params;
    this.backLink = null;
    this.templateLoaded = false;
    this.modal = null;
    this.controls = null;
    this.game = null;
    this.save = null;
    this.documentId = null;
    this.level = null;
    this.levelId = null;
    this.driftName = null;
    this.progression = null;
    this.allLevels = null;
    this.loaded = {
      controls: false,
      prompts: false,
      submit: false,
      settingsBar: false
    };

    console.log("MetaGame: Project ID", projectId, "Project Name", projectName);
  }

  /**
   * Initialize the meta game system
   * @param {Object} game - The game instance (not yet initialized)
   */
  async initialize(game) {
    // If no save exists, skip MetaGame and just run game standalone
    // if (!GameplaySave.hasLocalStorage()) {
    //   await game.initialize();
    //   console.log("No local storage found, skipping MetaGame");
    //   return;
    // }
    
    this.game = game;
    this.save = this.loadSave();

    // Ensure a save always exists so save/load/documents work outside drifts
    // too (standalone editors), not just inside a drift progression.
    if (!this.save) {
      this.save = new GameplaySave();
      console.log('MetaGame.initialize() no existing save — created a new empty save (standalone mode)');
    }

    this.driftName = this?.save?.getSelectedDrift();

    if (!this.driftName) {
      console.error('No selected drift', this);
    }
    
    // Load drifts to get initial state
    const drifts = await Drifts.fromFile(window.BASE_PATH + '/drifts/drifts.json');

    // Get levelId - either from selected document or from save metadata
    let levelId = null;
    
    // Check if there is a current document id and it matches this editor
    if (this.save?.getSelectedDocumentId()) {
      let documentId = this.save.getSelectedDocumentId();
      console.log('MetaGame.initialize() selected document id', this.save.getSelectedDocumentId());
      let doc = this.save.getDocument(documentId);
      if (doc && doc.getField('sourceEditor') === this.projectId) {
        this.documentId = documentId;
        // Get the level key from the document
        levelId = doc.getField('levelId');
      }
    }

    // If no levelId from document, check save metadata
    if (!levelId) {
      levelId = this.save?.getMetadata('selectedlevelId');
    }

    // Use the levelId to load the correct level
    if (levelId) {
      this.levelId = levelId;
      this.level = this.getLevelForKey(this.driftName, levelId, drifts);
      
      // Verify that the level's editor matches this editor
      if (this.level && this.level.editor !== this.projectId) {
        console.error('Level editor mismatch', {
          levelId,
          levelEditor: this.level.editor,
          currentEditor: this.projectId
        });
        this.level = null;
        this.levelId = null;
      }
    }

    if (this.driftName) {
      this.allLevels = drifts.getLevels(this.driftName);
      this.progression = drifts.data[this.driftName].progression || [];
    } else {
      this.allLevels = null;
      this.progression = null;
    }

    const queryContext = {
      driftName: this.driftName,
      levelId: this.levelId,
      progression: this.progression || [],
    };

    // The level's seed state (drifts.json initialState). For a new document
    // this gets baked into the document content at creation.
    let levelSeed = null;
    if (this.level?.['initialState']) {
      const stateObj = this.level['initialState'];
      // A query object (vs a literal string) is resolved through getText.
      if (stateObj?.text != null && typeof stateObj.text === 'object') {
        stateObj.text = joinText(await getText(this.save, stateObj.text, queryContext));
      }
      levelSeed = stateObj;
    }

    if (!this.documentId && this.save) {
      if (!this.level) {
        // Standalone editor (no drift level): reuse this editor's most recent
        // document instead of creating a fresh empty one on every visit, and
        // remember it as selected.
        this.documentId = this.findLatestDocumentForEditor()
          || this.createNewDocument(this.save, levelSeed);
        this.save.setMetadata('selectedDocumentId', this.documentId);
      } else {
        this.documentId = this.createNewDocument(this.save, levelSeed);
      }
      console.log('MetaGame.initialize() document id', this.documentId);
      this.save.saveToLocalStorage();
    }

    // The state handed to the editor: the document's saved content (which holds
    // the seed for new docs and the latest text for resumed ones), falling back
    // to the level seed. Editors just consume options.initialState — they don't
    // need to read the save/document themselves.
    const initialState = this.loadDocumentState() ?? levelSeed;

    // Load progression prompts
    await this.loadTemplate();
    await this.loadAndDisplayPrompts(this.save, this.level);
    await this.populateSubmitButton();
    await this.createModal();

    let settingsOverride = this?.level?.settings || {};

    if(this.level) {
      this.backLink = {
        href: window.BASE_PATH + '/new-drift',
        text: "Drifts"
      };
    } else {
      this.backLink = {
        href: window.BASE_PATH + '/',
        text: 'The Writer\'s Project'
      };
    }
    
    //  initialize game with save and document (after prompt is displayed)
    await this.game.initialize({
      driftName: this.driftName,
      save: this.save, 
      documentId: this.documentId,
      level: this.level,
      initialState: initialState,
      ...settingsOverride,
    });

    // Initialize controls
    this.controls = new MetaGameControls({
      projectId: this.projectId,
      projectName: this.projectName || this.projectId,
      description: this.description,
      game: this.game,
      save: this.save,
      documentId: this.documentId,
      backLink: this.backLink,
      useSettingsBar: this.options.useSettingsBar,
      onNewDocument: () => this.handleNewDocument()
    });

    await this.controls.initialize();
    this.loaded.controls = this.controls?.templateLoaded;
    this.loaded.settingsBar = this.controls?.settingsBarLoaded;
    
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

  createNewDocument(save, initialState = null) {
    const documentId = `doc_${Date.now()}`;
    
    let initialContent = '';
    if (initialState) {
      initialContent = JSON.stringify(initialState);
    }
    
    const document = new Document(documentId, {
      createdAt: new Date().toISOString(),
      content: initialContent,
      sourceEditor: this.projectId,
      driftName: this.driftName,  // Store the drift so drift-scoped queries resolve
      levelId: this.levelId,  // Store the level key in the document
      title: 'Untitled'
    });
    save.addDocument(document);
    save.setMetadata('dateModified', new Date().toISOString());
    return documentId;
  }

  // Parse the current document's saved content into a state object. This is
  // the single place document content is read — editors receive the result as
  // options.initialState and should not read the save/document themselves.
  loadDocumentState() {
    if (!this.save || !this.documentId) return null;
    const doc = this.save.getDocument(this.documentId);
    const content = doc?.getField('content');
    if (!content) return null;
    try {
      return JSON.parse(content);
    } catch (e) {
      console.error('MetaGame.loadDocumentState() could not parse content', e);
      return null;
    }
  }

  getLevelForKey(driftName, levelId, drifts) {
    const levels = drifts.getLevels(driftName);
    return levels.find(level => level.id === levelId) || null;
  }

  logLoadedComponents() {
    console.log("loading initial", this.level)

    const components = {
      Controls: this.loaded.controls,
      SettingsBar: this.loaded.settingsBar,
      Prompts: this.loaded.prompts,
      Submit: this.loaded.submit,
      InitialState: this.level?.['initialState'],
      Autosave: this.game
    };
    
    const loaded = Object.keys(components).filter(k => components[k]).join(', ') || 'None';
    const notLoadedList = Object.keys(components).filter(k => !components[k]);
    
    const driftInfo = this.driftName && this.levelId 
      ? ` | Drift: ${this.driftName}/${this.levelId}` 
      : '';
      // need to add the levelid to this
    console.log(`MetaGame [${this.projectId}] Level: ${this.levelId} Doc: ${this.documentId || 'none'}${driftInfo}`);
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
    if (this.save) {
      const newDocumentId = this.createNewDocument(this.save);
      this.save.setMetadata('selectedDocumentId', newDocumentId);

      this.save.saveToLocalStorage();
    }
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
    
    // Single write path: putText sets the content channel, bumps timestamps,
    // and persists.
    putText(this.save, { type: 'content', documentId: this.documentId }, state);
  }

  async loadTemplate() {
    if (this.templateLoaded) return;
    
    try {
      const response = await fetch(window.BASE_PATH + '/drifts/MetaGame.html');
      const html = await response.text();
      
      // Parse the HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Extract and inject CSS
      const style = doc.querySelector('style');
      if (style) {
        document.head.appendChild(style.cloneNode(true));
      }
      
      this.templateLoaded = true;
    } catch (error) {
      console.error('Failed to load MetaGame template:', error);
    }
  }

  async loadAndDisplayPrompts(save, level) {
    try {
      let prompt = await this.getPromptFromLevel(save, level);

      if (prompt) {
        this.populatePromptDisplay(prompt);
      }

      return;
    } catch (error) {
      console.error('Error loading prompts:', error);
    }
  }

  async getPromptFromLevel(save, level) {
    const entries = await getText(save, level?.prompt, {
      driftName: this.driftName,
      levelId: this.levelId,
      progression: this.progression || [],
    });
    return joinText(entries);
  }


  populatePromptDisplay(promptHtml) {
    // some editors have a prompt-container
    const promptContainer = document.getElementById('prompt-container');
    if (promptContainer) {
      promptContainer.style.display = 'flex';
    }

    const promptDisplay = document.getElementById('prompt-display');
    if (promptDisplay) {
      
      promptDisplay.innerHTML = promptHtml?.replaceAll("\n", "<br><br>");
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
        submitButton.addEventListener('click', () => this.handleSubmitDocument());
      } else {
        console.error('No submit button found');
      }
    }
  }

  async createModal() {
    const content = '<h1>Your submission</h1><div id="alternate-text"></div>';
    this.modal = new Modal('complete-modal', content);
    this.modal.onCancel = () => this.handleModalCancel();
    this.modal.onContinue = () => this.handleModalContinue();
    await this.modal.create();
  }

  async handleSubmitDocument() {
    // Get the alternate text and populate modal
    const alternateText = await this.getAlternateText();
    const alternateTextElement = this.modal.element.querySelector('#alternate-text');
    if (alternateTextElement && alternateText) {
      alternateTextElement.textContent = alternateText;
    }
    
    // Show the modal
    this.modal.show();
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
    // Save the current state with image (this is the actual submission)
    if (this.game && this.save && this.documentId) {
      // set the current document as the level's chosen one (drift levels only)
      if (this.levelId) {
        setChosenDocumentForLevel(this.save, this.levelId, this.documentId);
      }

      const state = await this.game.saveState();
      if (state) {
        await saveStateWithImage(state, this.save, this.documentId);
      }
    }

    // Mark current level as completed
    if (this.save && this.levelId) {
      const completedLevels = this.save.getMetadata('completedLevels') || [];
      if (!completedLevels.includes(this.levelId)) {
        completedLevels.push(this.levelId);
        this.save.setMetadata('completedLevels', completedLevels);
        this.save.saveToLocalStorage();
      }
    }

    // In a drift level → back to the drift; otherwise → the editors list.
    window.location.href = this.level ? window.BASE_PATH + '/drifts/' : window.BASE_PATH + '/';
  }

  findNextEditor() {
    if (!this.progression || !this.levelId || !this.allLevels) {
      return null;
    }
    
    // Find current position in progression
    const currentIndex = this.progression.indexOf(this.levelId);
    
    if (currentIndex === -1 || currentIndex >= this.progression.length - 1) {
      return null; // Last in progression or not found
    }
    
    // Get next level
    const nextKey = this.progression[currentIndex + 1];
    const nextLevel = this.allLevels.find(level => level.id === nextKey);
    
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
