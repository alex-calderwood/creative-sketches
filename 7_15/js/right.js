let center;
let bc;
var colors = []
let saturation, value;
let lineWidth;
let g1, g2;
let mod;

function setup() {
    var c = createCanvas(windowWidth, windowHeight);

    center = createVector(windowWidth /2, windowHeight / 2);

    colorMode(HSL);

    frameRate(random(5, 60));

    saturation = 51;
    value = 55;

    g1 = color(50, saturation, random(value, value  * 2));
    g2 = color(50, saturation, random(value * 1/4, value));

    bc = color(50, saturation, value, 1);
    bc2 = color(50, saturation, value, 102);

    backgroundGradient();

    colors = makeColors()

    lineWidth = random(10, 90);

    mod = Math.floor(random(2, 12));

}

function makeColors() {
    var colors = []
    var prev = random(256);
    var alpha = 1
    for (var i = 0; i < 100; i ++) {
        prev = (prev + random(1,3)) % 256
        colors.push(color(prev,saturation,value,1));
        alpha = alpha *= 0.96;

    }
    return colors;
}

function drawArrow(point, c) {
    var alot = 1000;
    strokeWeight(0);
    fill(c);

    beginShape();
    vertex(point.x - center.x, 0);
    vertex(point.x, point.y);
    vertex(point.x - center.x, windowHeight);
    vertex(point.x - center.x, windowHeight - lineWidth);
    vertex(point.x - lineWidth, point.y);
    vertex(point.x - center.x, lineWidth);
    endShape(CLOSE);
}


function backgroundGradient() {
    noFill();
    for(var i = 0; i < windowWidth; i ++) {
        var interp = map(i, 0, windowWidth, 0, 1)
        stroke(lerpColor(g1, g2, interp));
        strokeWeight(1);
        line(i, 0, i, windowHeight);
    }
}

function draw() {

//    background(bc);

    var start = createVector(0, center.y)

    if(frameCount % mod == 0) {
        var point = start.copy().add(9 * frameCount, 0);
//        var point = center;
        drawArrow(point, colors[frameCount % colors.length]);
    }
}