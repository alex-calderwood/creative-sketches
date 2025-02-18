// http://www.joemckaystudio.com/multisketches/
// TODO fix 1, 1, 700

var inputs = [];    // user input

var bbox = null;    // bounding box
var xOffset = null; // variables to center the window
var yOffset = null;
var dots = [];      // Points to be classified
var w = [0, 0, 0];  // weight vector
var separator = []; // seperator (x, y), (x, y)
var m = null;       // slope of seperator

var entered = false; // has user pressed enter?
var debug = false;    // debug flag

var cursor = null;

function setup() {

    bbox = [windowWidth, windowHeight * (3/4)];
    xOffset = bbox[0] * 1/2;
    yOffset = bbox[1] * 1/2;

    smooth();
    canvas = createCanvas(bbox[0], bbox[1]);
    frameRate(1);

    createElement('br')
    let w1 = createInput('1');
    let w2 = createInput('1');
    let b = createInput('0');

    inputs = [w1, w2, b];
    separator = [createVector(0, 0), createVector(0, 0)]

    placeDots();

    textAlign(CENTER);
    ellipseMode(CENTER);

    drawDots();
}

function drawBackground() {
    // Background
    background(color(255, 255, 255, 255));
    drawSep(separator);
    drawDots();
}

function drawSep(separator) {
    // Create a vector defining angle of seperator and another perpendicular to it
    var sepVec = p5.Vector.sub(separator[0], separator[1]).normalize();

    let perpVec;
    if (sepVec.x == 0) { // vertical line
        perpVec = createVector(-1, 0);
    } else if (sepVec.y == 0) {
        perpVec = createVector(0, 1);
    } else {
        perpVec = createVector(separator[0].x, - (separator[0].x * sepVec.x) / sepVec.y);
    }

    if (w[0] >= 0) { // TODO figure out why this works
        perpVec.mult(-1);
    }

    perpVec.normalize().mult(2 * bbox[0]);

    p3 = p5.Vector.add(separator[0], perpVec)
    p4 = p5.Vector.add(separator[1], perpVec)

    fill(100, 100, 100, 100)
    beginShape();
        vertex(separator[0].x + xOffset, separator[0].y + yOffset);
        vertex(separator[1].x + xOffset, separator[1].y + yOffset);
        vertex(separator[1].x + xOffset, p4.y + yOffset);
        vertex(p3.x + xOffset, p4.y + yOffset);
        vertex(p3.x + xOffset, separator[0].y + yOffset);
    endShape(CLOSE);

    strokeWeight(1);
    fill('black')
    line(separator[0].x + xOffset, separator[0].y + yOffset, 
         separator[1].x + xOffset, separator[1].y + yOffset);
}

function drawDots() {
    
    for (let dot of dots) {
        var dotProduct = (w[0] * dot.position.x) + (w[1] * dot.position.y) + w[2];
        // Save the value
        dot.dot = dotProduct;

        
        // Draw the circles around the dots
        if (dotProduct > 0) {
            fill(255, 255, 255, 150);
            stroke(255, 255, 255, 150);
        } else {
            fill(0, 0, 0, 150);
            stroke(0, 0, 0, 150);
        }


        textSize(20);
        strokeWeight(0);
        text(dot.class ? '+' : '-',  dot.uv.x + xOffset, dot.uv.y + yOffset)

        strokeWeight(1);
        noFill();
        if ((dotProduct > 0 && dot.class) || (dotProduct <= 0 && !dot.class)) {
            circle(dot.uv.x + xOffset, dot.uv.y + yOffset - 5, 14);
        }
        
        if (debug) {
            fill(0, 0, 0, 100);
            noStroke();
            text(dot.position.x.toFixed(0) + ' ' + dot.position.y.toFixed(0) + '\n' + dot.dot.toFixed(0), dot.uv.x + xOffset, dot.uv.y + yOffset + 14);
        }
    }

    // Debug text / debug points
    stroke(50, 50, 50, 255);
    strokeWeight(0);
    fill(0, 190, 190, 255);
    if (debug) {
        line(separator[0].x, separator[0].y + yOffset,
        separator[1].x, separator[1].y + yOffset);
        circle(xOffset, yOffset, 10);
        circle(xOffset - w[2], yOffset, 10);
    }
}

function placeDots() {
    let numDots = 1000;
    for (let i = 0; i < numDots; i ++) {
        let x = random(bbox[0]) - xOffset;
        let y = random(bbox[1]) - yOffset;
        dots.push( {
            position: createVector(x, y),
            uv: createVector(x, - y),
            class: random([ 0, 1 ])
        });
    }
}

function keyPressed() {
    if (keyCode === ENTER) {
        entered = true;
        
        var w1 = parseFloat(inputs[0].value());
        var w2 = parseFloat(inputs[1].value());
        var b = parseFloat(inputs[2].value());

        if (isNaN(w1)) {
            w1 = 0;
        }
        if (isNaN(w2)) {
            w2 = 0;
        }
        if (isNaN(b)) {
            b = 0;
        }

        // set w vector globally
        w = [w1, w2, b];

        // calculate linear sepeator coordinates
        if ( w2 == 0 && w1 != 0) { // vertical line
            separator[0].x = -b / w1;
            separator[0].y = -yOffset;
    
            separator[1].x = -b / w1;
            separator[1].y = yOffset;
        } else {
            if ( b == 0) {
                m = - w1 / w2;
            } else {
                // solve for two points by setting dotproduct to 0
                let p1 = createVector(0, -b / w2); // y intercept
                let p2 = createVector(-b / w1, 0); // x intercept
                m = ( p1.y - p2.y ) / (p1.x - p2.x);
            }
    
            // Define the seperator coordinates in UV space (means -y)
            separator[0].x = -xOffset;
            separator[0].y = - m * -xOffset + (b / w2);
    
            separator[1].x = xOffset;
            separator[1].y = - m * xOffset + (b / w2);
        }

        if (debug) {
            console.log('m', m, 'w1', w1, 'w2', w2, 'b', b)
            console.log('sep', separator[0].x, separator[0].y, separator[1].x, separator[1].y)
        }

        drawBackground()
    } else if (key == 'd') {
        debug = !debug;
        drawBackground()
    }
}