export class Drifts {
    constructor() {
        this.data = {};
    }

    getDrift(driftName) {
    return this.data[driftName];
    }

    getDriftNames() {
        return Object.keys(this.data);
    }

    getLevels(driftName) {
        let levels = this.data[driftName]?.levels || [];
        return levels.map(level => {
            return {
                ...level,
                id: level.id || this.nameToId(level.name),
            };
        });
    }

    nameToId(name) {
        // make it html safe
        return name.toLowerCase().replace(/[^a-zA-Z0-9]/g, '-');
    }

    static async fromFile(filepath) {
        const drifts = new Drifts();
        const response = await fetch(filepath);
        drifts.data = await response.json();
        return drifts;
    }
}
