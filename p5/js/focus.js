let l = []
let cameraPos;
let cameraZ;
let focusDist = 1000; // How far from the camera to focus on (set this here).
let focusPoint; // The actual z distance to focus on.
let sampleFactor = 20; // This number is multiplied by the size of each line to produce the number of sampled points

// Inspired by https://inconvergent.net/2019/depth-of-field/

//A line in 3D, l=[a, b];
//a camera at position, c;
//a focus distance from camera, f
//a distance function, dst(a, b) that yields the distance between a and b;
//a function, lerp(a, b, s) = a + s*(b-a), which interpolates between a and b;
//a function, rnd(), that yields random numbers between 0 and 1; and
//a function, rndSphere(r), that

class FocusStructure {
    constructor(edges) {
        this.lines = [];
        this.x = edges[0][0].x;
        this.y = edges[0][0].y;
        this.z = edges[0][0].z;

        // Some constants for logging
        let numLines = edges.length;
        this.maxDist = (-focusDist) ** 3;
        this.minDist = focusDist ** 3

        for (let edge of edges) {
            // Create each edge
            let newLine = new FocusLine(edge[0].x, edge[0].y, edge[0].z, edge[1].x, edge[1].y, edge[1].z);
            this.lines.push(newLine)
            
            // Check to see if contains the new farthest or closest point to the camera
            let check = newLine.p1.dist(cameraPos);
            if (check > this.maxDist) {
                this.maxDist = check;
                this.maxp = newLine.p1;
            }
            check = newLine.p2.dist(cameraPos);
            if (check > this.maxDist) {
                this.maxDist = check;
                this.maxp = newLine.p2;
            }
            check = newLine.p1.dist(cameraPos);
            if (check < this.minDist) {
                this.minDist = check;
                this.minp = newLine.p1;
            }
            check = newLine.p2.dist(cameraPos);
            if (check < this.minDist) {
                this.minDist = check;
                this.minp = newLine.p2;
            }
        }
    }

    render() {
        for (l of this.lines) {
            l.render();
        }
    }

    moveInZ(dz) {
        for (l of this.lines) {
            l.p1.z += dz;
            l.p2.z += dz;
        }
    }
}

class FocusLineOld {

    constructor(x1, y1, z1, x2, y2, z2) {
        this.p1 = createVector(x1, y1, z1);
        this.p2 = createVector(x2, y2, z2);
    }

    render() {
        // Long lines should get more points than short lines
        this.numSamples = sampleFactor * this.p1.dist(this.p2);

        let m = 0.3; // a parameter that adjusts the size of the depth of field sphere (the "Circle of Confusion")
        let e = 0.6; // adjusts the distribution of the samples inside the sampling sphere.
        for(let i = 0; i < this.numSamples ; i ++) {
            // Sample a point on the line
            let v = p5.Vector.lerp(this.p1, this.p2, random(1));

            // Calculate dist to camera
            let d = v.dist(cameraPos);

            // Find the sample radius
            let r = m * Math.pow(Math.abs(focusDist - d), e);

            // Get a point
            let w = v.copy().add(randSphere(r));

            // Project m onto R2 and draw it
            point(w.x, w.y)
        }
    }

}

function randSphere(r) {
    //returns random points inside a sphere with radius, r.
    // https://karthikkaranth.me/blog/generating-random-points-in-a-sphere/

    // not working
//    let radius = Math.cbrt(random(0, r))
//    let theta = random(0, TWO_PI)
//    let phi = Math.acos(random(-1, 1))
//
//    return createVector(radius * cos(theta) * sin(phi), radius * sin(theta) * sin(phi), radius * cos(phi));

//     Inefficient way
    let p = createVector(random(-r, r), random(-r, r), random(-r, r));
    while (p.mag() > r) {
        p = createVector(random(-r, r), random(-r, r), random(-r, r));
    }

    return p

}

class FocusLine {

    constructor(x1, y1, z1, x2, y2, z2) {
        this.p1 = createVector(x1, y1, z1);
        this.p2 = createVector(x2, y2, z2);
    }

    render() {
        // Long lines should get more points than short lines
        this.numSamples = sampleFactor * this.p1.dist(this.p2);

        let m = 0.3; // a parameter that adjusts the size of the depth of field sphere (the "Circle of Confusion")
        let e = 0.6; // adjusts the distribution of the samples inside the sampling sphere.
        for(let i = 0; i < this.numSamples ; i ++) {
            // Sample a point on the line
            let v = p5.Vector.lerp(this.p1, this.p2, random(1));

            // Calculate dist to camera
            let d = v.dist(cameraPos);

            // Find the sample radius
            let r = m * Math.pow(Math.abs(focusDist - d), e);

            // Get a point
            let w = v.copy().add(randSphere(r));

            // Project m onto R2 and draw it
            point(w.x, w.y)
        }
    }

}

function randSphere(r) {
    //returns random points inside a sphere with radius, r.
    // https://karthikkaranth.me/blog/generating-random-points-in-a-sphere/

    // not working
//    let radius = Math.cbrt(random(0, r))
//    let theta = random(0, TWO_PI)
//    let phi = Math.acos(random(-1, 1))
//
//    return createVector(radius * cos(theta) * sin(phi), radius * sin(theta) * sin(phi), radius * cos(phi));

//     Inefficient way
    let p = createVector(random(-r, r), random(-r, r), random(-r, r));
    while (p.mag() > r) {
        p = createVector(random(-r, r), random(-r, r), random(-r, r));
    }

    return p

}