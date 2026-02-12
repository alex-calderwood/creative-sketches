/**
 * SettingsMixin - Adds settings management to a class
 * 
 * Use this when you want users to be able to configure and adjust how something works.
 * It handles validation and lets you respond to changes.
 * 
 * Usage:
 *   class MyClass extends SettingsMixin(class {}) {
 *     constructor() {
 *       super();
 *       this.params = { fontSize: 16, color: 'red' };  // Default values
 *       this.settings = [                               // Settings metadata
 *         { name: 'fontSize', type: 'number', description: 'Font size' },
 *         { name: 'color', type: 'string', description: 'Text color' }
 *       ];
 *     }
 * 
 *     // Optional: Handle specific setting changes
 *     onSettingChanged(name, value, oldValue) {
 *       if (name === 'fontSize') {
 *         this.element.style.fontSize = `${value}px`;
 *       }
 *     }
 *   }
 * 
 */
export const SettingsMixin = (Base) => class extends Base {
    getSetting(key) {
        if (!(key in this.params)) {
            let validNames = Object.keys(this.params).join(', ');
            throw new Error(`Invalid setting key: ${key}. Valid keys: ${validNames}`);
        }
        return this.params[key];
    }

    updateSetting(key, value) {
        if (!(key in this.params)) {
            let validNames = Object.keys(this.params).join(', ');
            throw new Error(`Invalid setting key: ${key}. Valid keys: ${validNames}`);
        }

        let oldValue = this.params[key];
        this.params[key] = value;
        
        // Call hook for specific setting behaviors
        if (this.onSettingChanged) {
            this.onSettingChanged(key, value, oldValue);
        }
    }

    getAllSettings() {
        let settings = {};
        this.settings.forEach((setting) => {
            let key = setting?.id || setting?.name;
            settings[key] = {
                ...setting,
                value: this.getSetting(key),
            };
        });
        return settings;
    }
};
