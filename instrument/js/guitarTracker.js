// <!-- http://www.velato.net/ -->
// <!-- https://www.musictheory.net/lessons/31 -->


let interval = {
    0: 0,
    1: 2,
    2: 2,
    3: 3,
    4: 3,
    5: 4,
    6: 5,
    7: 5,
    8: 6,
    9: 6,
    10: 7,
    11: 7
}

let majorScale = [0, 2, 4, 5, 7, 9, 11];

class GuitarTracker {
    constructor() {
        this.root = 0; // low E
        this.programPosition = 0;
        this.notes = [-1, -1, -1];
        this.numPlayed = 0;
        this.scale = majorScale;
    }

    playNote(playedNote) {
        if (this.programPosition === 0) {
            this.notes[0] = playedNote;
        } else if (this.programPosition === 1) {
            this.notes[1] = playedNote;
        } else if (this.programPosition === 2) {
            this.notes[2] = playedNote;
        }


        this.programPosition = (this.programPosition + 1) % this.notes.length;
        this.numPlayed += 1;

        if (this.programPosition === 2) {
            this.root = this.notes[0];
            let interval1 = this.getInverval(this.notes[1], this.root);
            let interval2 = this.getInverval(this.notes[2], this.root);
            console.log('root', this.root, 'interval1', interval1, 'interval2', interval2);

            if (this.scale.includes(interval1)) {
                return interval2;
            }
            return interval1;
        }
        return null;
    }

    getInverval(playedNote, root) {
        let semiTone = playedNote - root;
        semiTone = semiTone % 12;
        if (semiTone < 0) {
            semiTone = semiTone + 12;
        }

        return semiTone;
        //  map right hand side to left hand side
        // 2nd	Minor 2nd	1 half-step
        // 2nd	Major 2nd	2 half-steps
        // 3rd	Minor 3rd	3 half-steps
        // 3rd	Major 3rd	4 half-steps
        // 4th	Perfect 4th	5 half-steps
        // 5th	Diminished 5th	6 half-steps
        // 5th	Perfect 5th	7 half-steps
        // 6th	Minor 6th	8 half-steps
        // 6th	Major 6th	9 half-steps
        // 7th	Minor 7th	10 half-steps
        // 7th	Major 7th	11 half-steps

    }

    

}