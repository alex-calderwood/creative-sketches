class Document {
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
}
