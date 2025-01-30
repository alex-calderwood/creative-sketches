const expectedOrigin = "https://localhost:8101"

let textColor = [255, 255, 255];
let backgroundColor = [0, 0, 0];
const userSpecLineHeight = 55

const aiColor = [191, 0, 0];
const deformColor = [97, 137, 133];
const mergeColor = [134, 22, 87];

function setup() {
    noStroke();
    background(0);

    var canvas = createCanvas(windowWidth, windowHeight);
    canvas.parent('canvas-container'); // Attach the canvas to the container

    rectMode(CORNERS);
    textAlign(LEFT, BOTTOM);
}

class TextPerformer {
    constructor() {
        this.words = {}; // {id: {word: "word", x: 0, y: 0, size: 0, wordWidth: 0}}
        this.wordOrder = []; // [id, id, id]
        this.lineHeight = userSpecLineHeight; // Keep track of the tallest word in the current line
    }

    draw() {
        background(0)

        let currentX = 0;
        let currentY = 0;

        for (let wordID of this.wordOrder) {
            let word = this.words[wordID];

            if (word.word === "\n") {
                currentX = 0;
                currentY += this.lineHeight;
                continue;
            }

            textSize(word.size);

            if (currentX + word.width > width) {
                currentX = 0;
                currentY += this.lineHeight;
            }
            if (currentY + word.size > height) {
                background(0);
                currentX = 0;
                currentY = 0;
            }

            word.x = currentX;
            word.y = currentY;

            fill(word.backgroundColor[0], word.backgroundColor[1], word.backgroundColor[2]); // set the color to the word's background color
            rect(word.x, word.y, word.x + word.wordWidth, word.y + word.size); // draw the background
            fill(word.color[0], word.color[1], word.color[2]); // set the color to the word's color
            text(word.word, word.x, word.y + word.size); // draw the word

            currentX += word.width + textWidth(" ");
        }
    }

    updateWord(id, word) {
        console.log("updating word", id, 'to', word);
        word.id = id;
        word = this.addPerformanceData(word);
        this.words[id] = word;
    }

    addWord(word) {
        console.log("adding word", word);
        let id = word.id;
        word = this.addPerformanceData(word);
        this.words[id] = word;
    
        if (word.after) {
            let index = this.wordOrder.indexOf(word.after);
            if (index === -1) {
                this.wordOrder.unshift(id);
            } else {
                this.wordOrder.splice(index + 1, 0, id);
            }

            delete word.after;

        } else {
            this.wordOrder.push(id);
        }

        return this.wordOrder.map(id => this.words[id]);
    }

    addPerformanceData(word) {
        let size = this.lineHeight;
        textSize(size);

        
        let wordWidth = word.word.length === 0 ? 0 : textWidth(word.word);
        
        let wordColor = textColor;
        if (word.ai) {
            wordColor = aiColor;
        } else if (word.deform) {
            wordColor = deformColor;
        } else if (word.merge) {
            wordColor = mergeColor;
        }

        return {...word, ...{
            size: size,
            width: wordWidth,
            color: wordColor,
            backgroundColor: backgroundColor,
        }};
    }

    deleteWord(id) {
        let index = this.wordOrder.indexOf(id);
        if (index !== -1) {
            this.wordOrder.splice(index, 1);
        }
        delete this.words[id];
    }

    reset() {
        this.words = {};
        this.wordOrder = [];
    }
}


let performer = new TextPerformer();

window.addEventListener("message", (event) => {
    // Always validate the origin of the message!
    if (event.origin !== expectedOrigin) {
        console.log("Message received from unexpected origin: ", event.origin, "which does not match expected origin of ", expectedOrigin);
        return;
    }
    
    let data = event.data.data;
    if (data && data.type === "addWord") {
        let newWords = performer.addWord(data.word);
        window.opener.postMessage({data: {type: "addWordResponse", words: newWords, status: "success"}}, "*");
    }

    if (data && data.type === "updateWord") {
        performer.updateWord(data.id, data.word);
    }

    if (data && data.type === "deleteWord") {
        performer.deleteWord(data.id);
    }

    if (data && data.type === "refresh") {
        performer.reset();
    }
});


function draw() {
    background(0, 0, 0, 3)
    performer.draw();
}
