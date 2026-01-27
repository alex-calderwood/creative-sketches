export class Directions {
    constructor() {
        this.data = {};
    }

    getDirection(directionName) {
    return this.data[directionName];
    }

    getDirectionNames() {
        return Object.keys(this.data);
    }

    getLevels(directionName) {
        let levels = this.data[directionName]?.levels || [];
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
        const directions = new Directions();
        const response = await fetch(filepath);
        directions.data = await response.json();
        return directions;
    }
}
