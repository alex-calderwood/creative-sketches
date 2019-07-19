let xstart, ystart;

function setup() {
    smooth();
    canvas = createCanvas(windowWidth, windowHeight);
    frameRate(20);

    xstart = random(10);
    ystart = random(10);

    background(color(0, 0, 0));

}

function draw() {
//    background(color(0, 0, 0, 4));

    var ynoise = ystart += 0.02;
    xstart += 0.03;

    for (var y = 0; y < windowHeight; y += 50) {
        ynoise += 0.1;
        var xnoise = xstart;
        for (var x = 0; x < windowWidth; x += 50) {
            xnoise += 0.1;
            if (Math.floor(random(24)) == 1) {
                console.log('draw');
                drawPoint(x, y, noise(xnoise, ynoise), sin(frameCount/200) ** 4);
            }
        }
    }
}

function drawPoint(x, y, noiseFactor, secondaryNoiseFactor) {
    rotation = (noiseFactor * TWO_PI);
//    stroke(40, 140  * (1 - noiseFactor) + 60, 70  * noiseFactor + 20, 220);
    stroke(255, 255, 255, 200);

    var weight = ((2.6 * noiseFactor) ** 2);

    if (weight < 1) {
        return;
    }

    strokeWeight(weight)

    var r = random(300 * noiseFactor);
    var x2 = x + r * cos(rotation);
    var y2 = y + r * sin(rotation);
    var x3 = x - r * cos(rotation);
    var y3 = y - r * sin(rotation);
    var x3 = x + r * cos(rotation + HALF_PI);
    var y3 = y + r * sin(rotation + HALF_PI);

//    point(x, y);
    point(x2, y2);
//    point(x3, y3);
}