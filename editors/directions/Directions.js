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
        return this.data[directionName]?.levels || {};
    }

    static async fromFile(filepath) {
        const directions = new Directions();
        const response = await fetch(filepath);
        directions.data = await response.json();
        return directions;
    }
}
