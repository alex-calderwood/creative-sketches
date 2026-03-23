/**
 * Base class for all performances (editors).
 * Subclasses must override the methods below.
 * MetaGame expects game.performance to implement this interface.
 */
export class Performance {
    constructor(params = {}) {
        this.params = { ...params };
        this.settings = [];
    }

    initialize() {
        throw new Error('initialize() must be implemented');
    }

    saveState() {
        throw new Error('saveState() must be implemented');
    }

    loadState(state) {
        throw new Error('loadState() must be implemented');
    }

    getAllSettings() {
        return this.settings.map(setting => ({
            ...setting,
            value: this.params[setting.id]
        }));
    }

    updateSetting(id, value) {
        this.params[id] = value;
        this.onSettingChanged(id, value);
    }

    onSettingChanged(id, value) {
        // Override to react to setting changes
    }
}
