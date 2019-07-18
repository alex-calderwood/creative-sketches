let l = []
let cameraPos;
let cameraZ;
let focusDist = 1000;
let numSampleFactor = 40;


// Inspired by https://inconvergent.net/2019/depth-of-field/


//A line in 3D, l=[a, b];
//a camera at position, c;
//a focus distance from camera, f
//a distance function, dst(a, b) that yields the distance between a and b;
//a function, lerp(a, b, s) = a + s*(b-a), which interpolates between a and b;
//a function, rnd(), that yields random numbers between 0 and 1; and
//a function, rndSphere(r), that

function setup() {
    canvas = createCanvas(windowWidth, windowHeight);

    cameraZ = Math.max(windowWidth, windowHeight);
    cameraPos = createVector(windowWidth / 2, windowHeight / 2, cameraZ);

    let numLines = 10;
    let max = (-focusDist) ** 3;
    let min = focusDist ** 3
    let maxp;
    let minp;
    for (let i = 0; i < numLines; i++) {
        newLine = new FocusLine(random(windowWidth), random(windowHeight), random(-focusDist, focusDist), random(windowWidth), random(windowHeight), random(-focusDist, focusDist));
        l.push(newLine)

        // Check to see if contains the new farthest or closest point to the camera
        let check = newLine.p1.dist(cameraPos);
        if (check > max) {
            max = check;
            maxp = newLine.p1;
        }
        check = newLine.p2.dist(cameraPos);
        if (check > max) {
            max = check;
            maxp = newLine.p2;
        }
        check = newLine.p1.dist(cameraPos);
        if (check < min) {
            min = check;
            minp = newLine.p1;
        }
        check = newLine.p2.dist(cameraPos);
        if (check < min) {
            min = check;
            minp = newLine.p2;
        }
    }

    newLine = new FocusLine(0, 0,-focusDist, windowWidth, windowHeight,focusDist);
    l.push(newLine)
    newLine = new FocusLine(0, windowHeight / 2,cameraZ - focusDist, windowWidth, windowHeight / 2, cameraZ - focusDist);
    l.push(newLine)
    
    let cubePoints = [
        createVector(0, 0, 0),
        createVector(0, 1, 0),
        createVector(1, 1, 0),
        createVector(1, 0, 0),
        createVector(0, 0, 1),
        createVector(0, 1, 1),
        createVector(1, 1, 1),
        createVector(1, 0, 1),
    ];

    cube = new FocusStructure(cubePoints);

    background(color(0, 0, 0));

    alph = 15
    stroke(color(255, 255, 255, alph))
    strokeWeight(0.0005)

    for (let curLine of l) {
        curLine.render()
    }

//    for (let j =0 ; j < 1000; j ++) {
//        p = randSphere(400);
//        point(p.x, p.y)
//    }

    print('Focus Distance', focusDist)
    print('CameraZ', cameraZ)
    print('Focus Point', cameraZ - focusDist)
    print('Camera', cameraPos.x, cameraPos.y, cameraPos.z)
    print('Min', min, minp)
    print('Max', max, maxp)

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

class FocusStructure {
    constructor(points) {
        this.lines = []
        for (let p1 of points) {
            for(let p2 of points) {
                l = new FocusLine(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
                lines.push(l)
            }
        }
    }

    render() {
        for (l of this.lines) {
            l.render();
        }
    }


}

class FocusLine {

    constructor(x1, y1, z1, x2, y2, z2) {
        this.p1 = createVector(x1, y1, z1);
        this.p2 = createVector(x2, y2, z2);
    }

    render() {
        // Long lines should get more points than short lines
        let numSamples = numSampleFactor * this.p1.dist(this.p2);

        let m = 0.2; // a parameter that adjusts the size of the depth of field sphere (the "Circle of Confusion")
        let e = 0.6; // adjusts the distribution of the samples inside the sampling sphere.
        for(let i = 0; i < numSamples ; i ++) {
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