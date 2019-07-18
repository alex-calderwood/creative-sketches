let xstart, ystart;

function setup() {
    smooth();
    canvas = createCanvas(windowWidth, windowHeight);
    frameRate(30);

    xstart = random(10);
    ystart = random(10);

    strokeWeight(0.3);

}

function draw() {
    background(color(0, 0, 0, 4));

    var ynoise = ystart += 0.01;
    xstart += 0.02;

    for (var y = 0; y < windowHeight; y += 50) {
        ynoise += 0.1;
        var xnoise = xstart;
        for (var x = 0; x < windowWidth; x += 50) {
            xnoise += 0.1;
            drawPoint(x, y, noise(xnoise, ynoise), sin(frameCount/200) ** 4);
        }
    }
}

function drawPoint(x, y, noiseFactor, secondaryNoiseFactor) {
    rotation = (noiseFactor * TWO_PI);
//    stroke(40, 140  * (1 - noiseFactor) + 60, 70  * noiseFactor + 20, 220);
    stroke(255, 255, 255, 50 + (170 * secondaryNoiseFactor));

    var r = 100 + (80 * secondaryNoiseFactor);
    var x2 = x + r * cos(rotation);
    var y2 = y + r * sin(rotation)

    line(x, y, x2, y2);
}