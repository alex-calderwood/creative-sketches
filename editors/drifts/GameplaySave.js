// Save file structure, channels, and the text-query API are documented in
// ./SAVE_FORMAT.md. Inspect a live save at /editors/drifts/admin.html.
import { Document } from './Document.js';

// Bump when the on-disk save shape changes; migrate() upgrades older saves.
export const SAVE_VERSION = 2;

export class GameplaySave {
    constructor() {
        this.documents = new Map();
        this.metadata = {};
    }

    // Add a document to the save
    addDocument(document) {
        this.documents.set(document.id, document);
    }

    // Get a document by id
    getDocument(id) {
        return this.documents.get(id);
    }

    // Check if document exists
    hasDocument(id) {
        return this.documents.has(id);
    }

    // Remove a document
    removeDocument(id) {
        return this.documents.delete(id);
    }

    // Get all documents
    getAllDocuments() {
        return Array.from(this.documents.values());
    }

    // Get document ids
    getDocumentIds() {
        return Array.from(this.documents.keys());
    }

    // Set metadata field
    setMetadata(key, value) {
        this.metadata[key] = value;
    }

    // Get metadata field
    getMetadata(key) {
        return this.metadata[key];
    }

    getSelectedDrift() {
        return this?.metadata?.selectedDrift || null;
    }

    getSelectedDocumentId() {
        return this?.metadata?.selectedDocumentId || null;
    }

    // NOTE: the old metadata.edits API (addEdit/getEdits/deleteEdits) has been
    // removed. Edits now live on the document that produced them and are read
    // through ContentQuery.getText({ type: 'edits', ... }). Legacy saves keep
    // their metadata.edits array (shown in admin/inspector) but it is inert.

    // Upgrade an older save in place. Idempotent.
    migrate() {
        // v2: stamp driftName onto documents that predate it, inferred from the
        // save's selected drift, so drift-scoped queries resolve.
        const selectedDrift = this.metadata.selectedDrift;
        if (selectedDrift) {
            for (const doc of this.documents.values()) {
                // Only stamp docs that belong to a drift level. Level-less docs
                // are standalone/sandbox sessions and don't belong to a drift.
                if (doc.getField('driftName') == null && doc.getField('levelId') != null) {
                    doc.setField('driftName', selectedDrift);
                }
            }
        }
        this.metadata.version = SAVE_VERSION;
    }

    // Serialize to JSON string
    write() {
        const saveData = {
            metadata: this.metadata,
            documents: Array.from(this.documents.values()).map(doc => doc.toJSON())
        };
        return JSON.stringify(saveData, null, 2);
    }

    // Deserialize from JSON string
    read(jsonString) {
        const saveData = JSON.parse(jsonString);
        this.metadata = saveData.metadata || {};
        this.documents.clear();
        
        if (saveData.documents) {
            saveData.documents.forEach(docData => {
                const document = Document.fromJSON(docData);
                this.documents.set(document.id, document);
            });
        }

        this.migrate();
    }

    // Create a new GameplaySave from JSON string
    static fromJSON(jsonString) {
        const save = new GameplaySave();
        save.read(jsonString);
        return save;
    }

    // Download save as file
    downloadSave(filename = 'gameplay-save.json') {
        const jsonString = this.write();
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Load save from file
    static async loadFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const save = GameplaySave.fromJSON(e.target.result);
                    resolve(save);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
    }

    // Save to localStorage
    saveToLocalStorage(key = 'gameplaySave') {
        const jsonString = this.write();
        localStorage.setItem(key, jsonString);
    }

    // Load from localStorage
    loadFromLocalStorage(key = 'gameplaySave') {
        const jsonString = localStorage.getItem(key);
        if (!jsonString) {
            throw new Error('No save found in localStorage');
        }
        this.read(jsonString);
    }

    // Create a new GameplaySave from localStorage
    static fromLocalStorage(key = 'gameplaySave') {
        const save = new GameplaySave();
        save.loadFromLocalStorage(key);
        return save;
    }

    // Check if save exists in localStorage
    static hasLocalStorage(key = 'gameplaySave') {
        return localStorage.getItem(key) !== null;
    }
}
