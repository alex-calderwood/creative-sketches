// live-server

// Parameters
const nWords = 10;

// Sprites
let words;
let board, boardX, boardY;

// Viewbox stuff
let viewWidth, viewHeight;

let font; 
let fontSize = 24;
let cellSize = 20;

let frame = 0;
let word1, word2;
let a = 1;

let sketch = function(p) {
    
     p.preload = function() { 
        // font = p.loadFont("../assets/Open_Sans/OpenSans-Light.ttf");  
        font = p.loadFont("../assets/Anonymous_Pro/AnonymousPro-Regular.ttf");
        p.frameRate(1)
    } 
        
     p.setup = function() {
        viewWidth = p.windowWidth;
        viewHeight = p.windowHeight;

        p.smooth();
        canvas = p.createCanvas(viewWidth, viewHeight);

        boardX = parseInt(viewWidth  / fontSize);
        boardY = parseInt(viewHeight / fontSize);
        board = new Board(boardX, boardY);

        board.setText("hello world", 3, 3);
        // Define the words
        words = []
        // Create words
        for(let i = 0; i < nWords; i++) {
            let word = new Word(
                Hierarchy.sample(),
                p.createVector(p.int(p.random(boardX)), p.int(p.random(boardY))), 
            );
            console.log(word);
            words.push(word);
        }
    }

    function collide(objects) {
        // pass
    }

    p.draw = function() {
        let updated = false;
        for (let word of words) {
            updated = word.update() || updated; 
        }
        // todo fix this logic
        // if (!updated) {
        //     return;
        // }

        p.background("white");
        // collide(words);
        p.strokeWeight(0.4);
        p.stroke(0);
        p.textSize(fontSize);
        // p.rectMode(p.CORNERS);
        // p.textAlign(p.CENTER, p.CENTER);
        p.textLeading(0);


        board.draw()

        frame ++;
        // for (let i = 0; i < viewWidth; i += fontSize) {
        //     p.line(i, 0, i, viewHeight);
        // }
        // for (let i = 0; i < viewHeight; i += fontSize) {
        //     p.line(0, i, viewWidth, i);
        // }
    }


class Board {
    constructor(xSize, ySize) {
        this.matrix = [];
        for(let i = 0; i < ySize; i++) {
            this.matrix[i] = Array(xSize);
            for(let j = 0; j < xSize; j++) {
                this.matrix[i][j] = " ";
            }
        }
    }

    draw() {
        for(let y = 0; y < this.matrix.length; y++) {
            for(let x = 0; x < this.matrix[0].length; x++) {
                if (this.matrix[y][x] !== " ") {
                    let bbox = font.textBounds(this.matrix[y][x], x * fontSize, y * fontSize);
                    p.fill(255);
                    p.stroke(0);
                    p.rect(bbox.x, bbox.y, bbox.w, bbox.h);
                    p.fill(0);
                    p.noStroke();
                }
                p.text(this.matrix[y][x], x * fontSize, y * fontSize);
            }
        }
    }

    setText(text, x, y) {
        for (let j = 0; j < text.length; j++) {
            this.matrix[y][x + j] = text.charAt(j);
        }
    }

    print() {
        for (let i = 0; i < this.matrix.length; i++) {
            console.log(this.matrix[i]);
        }

        for(let x = 0; x < board.matrix.length; x++) {
            let row = []
            for(let y = 0; y < board.matrix[x].length; y++) {
                row.push(this.matrix[x][y]);
            }
            console.log(row);
        }
    }
}

    class Motion {
        constructor(text) {
            this.motion = Motion.motions[text];
        }

        move(word) {
            console.log("moved")
            // move according to its default motion function
            return this.motion.default(word);
        }

        static motions = {
            "thing":    {default: Motion.stop},
            "bird":   {default: Motion.bounce},
            "birds":   {default: Motion.stop},
            "sand":     {default: Motion.fall},
            "rock":    {default: Motion.stop},
            "rocks":    {default: Motion.fall},
        }

        static stop(word) {
            word.view.velocity.x = 0;
            word.view.velocity.y = 0;
            return false
        }

        static bounce(word) {
            // Wall bounce logic
        }

        static fall(word) {
            console.log("fall")
            let initial = word.view.position.copy()
            let v = 1;
            if (word.view.position.y >= boardY - 2) {
                word.view.position.y = boardY;
                word.view.velocity = 0;
            }
            else {
                word.view.position.add(p.createVector(0, v));
                console.log(initial, word.view.position)
            }
            return !initial.equals(this.poisiton)
        }

        static dance = (word) => {
            // if (frame > s * 3.7) {
            //     word1.sprite.velocity.y = 0;
            //     word2.sprite.velocity.y = 0;
            // }
            // else if (frame > s * 3) {
            //     word1.sprite.velocity.y = 1;
            //     word2.sprite.velocity.y = -1;
            // }
            // else if (frame > s * 2.6) {
            //     word1.sprite.velocity.y = 0;
            //     word2.sprite.velocity.y = 0;
            // }
            // else if (frame > s * 2.2) {
            //     word1.sprite.velocity.y = -1;
            //     word2.sprite.velocity.y = 1;
            // }
            // else if (frame > s * 1.7) {
            //     word1.sprite.velocity.y = 0;
            //     word2.sprite.velocity.y = 0;
            // }
            // else if (frame > s) {
            //     word1.sprite.velocity.y = 1;
            //     word2.sprite.velocity.y = -1;
            // }
        }
    }

    class Hierarchy {
        static seed = ["rock", "sand"]

        static _next = {
            "thing":    {"meta": "nothing", "merge": "things"},

            "bird":   {"meta": "thing",   "merge": "flock"},
            "flock":   {"meta": "thing",   "merge": "flocks"},
            "flocks":   {"meta": "thing",   "merge": "flocks"},

            "sand":     {"meta": "thing",   "merge": "sand"},

            "rock":     {"meta": "thing",   "merge": "rocks"},
            "rocks":    {"meta": "thing",   "merge": "rocks"},
        }

        constructor(text) {
            this.text = text;
            this.properties = Hierarchy._next[this.text];
        }

        next() {
            this.text = this.properties[this.text];
        }

        merge(other) {
            console.log("merge", this, other);
            if (other.text == this.text) {
                this.text = this.properties["merge"];
                return true;
            } else if (this.properties.meta == other.text || this.text == other.properties.meta){
                this.text = this.properties.meta["merge"];
                return true;
            }
            return false;
        }

        static sample() {
            // Create a random object from the possible hiearchies
            let size = Hierarchy.seed.length;
            let i = p.int(p.random(0, size));
            let text = Hierarchy.seed[i];
            // console.log("sample", Object.keys(Hierarchy._next), i, text, typeof(text));
            return new Hierarchy(text);
        }
    }

    class WordView {
        constructor(word, position, velocity) {
            this.position = position;
            this.velocity = velocity;
            this.word = word;
        }

         //     p.strokeWeight(0.4);
        //     p.stroke(1);
        //     p.textSize(fontSize);
        //     p.rectMode(p.CENTER);
        //     p.textAlign(p.CENTER, p.CENTER);

        //     // Move with the currently defined motion
        //     this.motion.move(this);

        //     console.log("collision", this.hierarchy);
        //     // Set the collision bounding box from the text box
        //     this.bbox = font.textBounds(this.hierarchy.text, this.sprite.position.x, this.sprite.position.y, fontSize);
        //     this.sprite.setCollider("rectangle", this.bbox.x + this.bbox.w / 2, this.bbox.y , this.bbox.w, this.bbox.h);
        //     // console.log("bbox", this.bbox, "position", this.sprite.position)

        //     if (false) 
        //         p.rect(0, 0, this.bbox.w, this.bbox.h)
        //     p.text(this.hierarchy.text, 0, 0);

        //     let v = this.sprite.velocity
        //     if (this.sprite.position.x < 0 || this.sprite.position.x >= viewWidth) {
        //         this.sprite.setVelocity(-v.x, v.y);
        //     }
        //     if (this.sprite.position.y < 0 || this.sprite.position.y >= viewHeight) {
        //         this.sprite.setVelocity(v.x, -v.y);
        //     }

            // Check colision
            // for (let other of words) {
            //     if (other == this)
            //         continue;
            //     this.sprite.collide(other, merge);
            // }
        placeOnBoard() {
            console.log("set", this.word.hierarchy.text, this.position.x, this.position.y)
            board.setText(this.word.hierarchy.text, this.position.x, this.position.y);
            // board.print()
        }
    }

    class Word {
        constructor(hierarchy, position) {
            if (hierarchy.text === undefined)
                throw "Text must be defined to create a word";
            this.hierarchy = hierarchy;

            this.motion = new Motion(hierarchy.text);
            if (this.motion === undefined)
                throw "Motion not defined for word " + this.hierarchy.text;

            this.view = new WordView(this, position, p.createVector(0, 0));
        }

        update() {
            console.log("word.update")
            let updated = this.motion.move(this);
            this.view.placeOnBoard()
            return updated;
            
        }
    }

    function merge(a, b) {
        // Merge two sprites

        a.velocity.add(b.velocity);
        a.velocity.div(2);
        let didMerge = a.object.hierarchy.merge(b.object.hierarchy);
        if (didMerge) {
            b.remove();
        }
    }
}

let myp5 = new p5(sketch);
