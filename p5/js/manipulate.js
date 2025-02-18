function setup() {
    smooth();
    canvas = createCanvas(windowWidth, windowHeight);
    frameRate(10);
    stroke('grey'); 
}

function draw() {
    background('white');
    
    drawGraph(100);
    drawGraph(300);
    drawGraph(500);
    drawGraph(700);
}

function drawGraph(y_offset) {
    for (let x = 0; x < windowWidth; x += TWO_PI * 0.01) {
        let a = 50;
        let w = 50;
        let y = a * sin(1/w * x);
        let y_actual = - y + y_offset;

        if (y == a || y == -a) {
            let c = collidePointPoint(x, y_actual, mouseX, mouseY, 9);
            if (c){
                strokeWeight(10);
            }
            else {
                strokeWeight(5)
            }
        } else {
            strokeWeight(1);    
        }
        point(x, y_actual);
    }
}