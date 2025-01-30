let baseRadius = 200;
let blobs = [];
let colors;

function setup() {
    let alpha = 255;
    colors = uniformSaturationColors(alpha);

    smooth();
    canvas = createCanvas(windowWidth, windowHeight);
    frameRate(30);

    for(let i = 0; i < 10; i ++) {
        let buffer = 100;
        let x = random(buffer, windowWidth - buffer)
        let y = random(buffer, windowHeight - buffer)
        let noiseAmp = 0.4;
        let edges = 100;
        blob = new Blob(x, y, colors[i], noiseAmp, edges);
        blobs.push(blob)
    }

    background(color('white'));
}

function draw() {
    background(color(255, 255, 255, 255));

    for(let blob of blobs) {
        blob.render()
        if(random(10) < 1) {
            blob.blubble(random(10) < 1);
        }
    }
}

class Point {
    constructor(x, y) {
        this.position = createVector(x, y);
        this.velocity = createVector(0, 0);
    }


    move() {
        this.position.add(this.velocity);
        this.velocity.add(this.acceleration);
        this.acceleration /= 2; // apply friction
    }

}


class Circle {
    constructor(x, y, c) {
        this.center = createVector(x,y);
        this.velocity = createVector(0,0);
        this.acceleration = createVector(0,0);
        this.diameter = 2 * baseRadius;
        this.color = c;

        this.stopped = false;
    }

    move(x, y) {
        this.center.x = x;
        this.center.y = y;
    }

    render() {
        fill(color(255,255,255));
        stroke(this.color);
        strokeWeight(1)
		ellipse(this.center.x, this.center.y, this.diameter, this.diameter);
    }

    setTragectoryToPoint(point) {
        this.velocity = point.sub(this.center);
        var speed = map(this.velocity.mag(), 0, windowWidth * 1.5, 0, 100);
        this.velocity.setMag(speed);
    }
}

class Blob extends Circle {

    constructor(x, y, c, edgeNoiseAmplitude, nEdges) {
        //edgeNoiseFactor: (0, 1) - how blobby to make the edges

        super(x, y, c);

        this.vertices = []
        this.nEdges = nEdges;
        this.edgeNoiseIterationFactor = 0.1;

        let startNoise = random(1000)

        for(let i = 0; i < nEdges; i++) {
            let angle = TWO_PI * (i / nEdges)

            let r = noise(angle + startNoise) * edgeNoiseAmplitude * this.diameter

            // Make one of the edge points in the blob, radiating from the center (x, y)
            this.vertices[i] = new Point(
                this.center.x + r * cos(angle),
                this.center.y + r * sin(angle)
            )
        }
    }

    blubble() {
        // shake a a bit

        let changeAcc = random(10) < 2;
        let randFactor = random(-1, 1);

        let noiseIndex = random(100);

        for(let i = 0; i < this.nEdges; i++) {
            let vert = this.vertices[i];
            let angle = TWO_PI * (i / this.nEdges)

            let x = vert.position.x - this.center.x
            let y = vert.position.y - this.center.y

            let vertexRadius = x / cos(angle);

//            let randFactor = random(-2,4);


            let randFactor = noise(noiseIndex += 0.01)

//            if (changeAcc) {
                vert.acceleration = createVector(randFactor * cos(angle), randFactor * sin(angle))
//            }

            vert.move()

        }
    }

    render() {
        strokeWeight(0.3)
        fill(this.color);

        beginShape();

        for (let vert of this.vertices) {
            vertex(vert.position.x, vert.position.y);
        }

        endShape(CLOSE);
    }
}