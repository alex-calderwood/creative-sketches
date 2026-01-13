class GameplaySave {
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
