export class Document {
    constructor(id, data = {}) {
        this.id = id;
        this.data = data;
    }

    // Get a field from the document
    getField(key) {
        return this.data[key];
    }

    // Set a field in the document
    setField(key, value) {
        this.data[key] = value;
    }

    // Check if a field exists
    hasField(key) {
        return key in this.data;
    }

    // Remove a field from the document
    removeField(key) {
        delete this.data[key];
    }

    // Get all data
    getData() {
        return { ...this.data };
    }

    // Set all data (replaces existing data)
    setData(data) {
        this.data = { ...data };
    }

    // --- Typed channel accessors -------------------------------------------
    // A document holds named "channels" of produced text. Today: 'content'
    // (the main authored text, stored as a JSON string {text, image}) and
    // 'edits' (an array of {text, ...}). New channel types can be added here
    // without touching the query layer.

    getDriftName() {
        return this.data.driftName ?? null;
    }

    getLevelId() {
        return this.data.levelId ?? null;
    }

    // Read the main authored text. Tolerates the legacy JSON-string form,
    // an already-parsed object, or a bare string.
    getContentText() {
        const content = this.data.content;
        if (content == null) return '';
        if (typeof content === 'object') return content.text ?? '';
        if (typeof content === 'string') {
            try {
                const parsed = JSON.parse(content);
                return parsed?.text ?? '';
            } catch {
                return content; // not JSON — treat as raw text
            }
        }
        return '';
    }

    // Set the main authored text, preserving sibling fields (e.g. image).
    setContentText(text) {
        let obj = {};
        const content = this.data.content;
        if (typeof content === 'string') {
            try { obj = JSON.parse(content) || {}; } catch { obj = {}; }
        } else if (content && typeof content === 'object') {
            obj = content;
        }
        obj.text = text;
        this.data.content = JSON.stringify(obj);
    }

    // Replace the whole content object (string or object accepted).
    setContent(value) {
        this.data.content = typeof value === 'string' ? value : JSON.stringify(value);
    }

    getEdits() {
        return Array.isArray(this.data.edits) ? this.data.edits : [];
    }

    appendEdit(edit) {
        const edits = this.getEdits();
        edits.push(edit);
        this.data.edits = edits;
    }

    setEdits(edits) {
        this.data.edits = Array.isArray(edits) ? edits : [];
    }

    // Serialize to JSON
    toJSON() {
        return {
            id: this.id,
            data: this.data
        };
    }

    // Deserialize from JSON
    static fromJSON(json) {
        return new Document(json.id, json.data);
    }

    static getDefaultContentTextField(doc, contentField='content') {
        let content = doc?.getField(contentField);
        if (!content) return '';
        try {
            return JSON.parse(content)?.text ?? '';
        } catch {
            return typeof content === 'string' ? content : '';
        }
    }
}
