let lines = [];
let n_segments = 10;
let base_spacing = 4;
let SPACING_MODIFIER = 1.05;



let frame_num = 0;
let x_offset = 1000235;
let y_offset = 42;

function setup() {
    smooth();
    canvas = createCanvas(windowWidth, windowHeight);
    frameRate(60);
    background('black');

    let first_line_points = []
    let start = createVector(0, 0);
    let end = createVector(0, windowHeight);
    let diff = p5.Vector.sub(end, start);
    let dy = diff.y;
    let base_height = dy / n_segments;

    first_line_points.push(start);
    for(let i = 0; i < n_segments; i++) {
        let point = createVector(0, base_height);
        point = p5.Vector.add(point, first_line_points[first_line_points.length - 1]);
        first_line_points.push(point)
    }

    let firstLine = new LifeLine(first_line_points)
    lines.push(firstLine)

    let spacing = base_spacing;
    for (let i = 1; i * spacing < windowWidth; i ++) {
        let prevLine = lines[i - 1];
        let x = spacing * i;
        let start = createVector(x, 0)
        let newLine = LifeLine.fromPrevLine(start, prevLine)
        lines.push(newLine)
        spacing *= random(1, SPACING_MODIFIER);
    }

}

function draw() {
    background(0);
    for (let l of lines) {
        // add a bit of noise to each point in each line
        LifeLine.noisePoints(frame_num, l.points);
        l.draw()
    }

    frame_num += 1;
}

class LifeLine {

    constructor(points) {
        this.start = points[0];
        this.points = points;
    }

    static fromPrevLine(start, prevVerticalLine) {
        let start_delta = p5.Vector.sub(start, prevVerticalLine.start);

        // Copy the other line
        let points = [];
        for (let p of prevVerticalLine.points) {
            let new_point = p5.Vector.add(start_delta, createVector(p.x, p.y))
            new_point.x += 7 * noise(new_point.x, new_point.y)
            new_point.y += random(-3, 3);
            points.push(new_point)
        }

        let lifeLine = new LifeLine(points);
        return lifeLine;
    }

    static noisePoints(frame_num, points) {

        
        for (let p of points) {
            x_offset = x_offset + 1;
            // y_offset = y_offset + 0.01;

            let height_mod = (noise(x_offset) * 5) - 2.5;
            p.y = p.y + height_mod;
            print(height_mod)
            // p.y += (noise(y_offset) * 5) - 2.5;
        }
    }

    draw(frame_num) { 
        stroke(255, 255, 255)
        noFill();
        beginShape();

        for(let i = 0; i < n_segments; i++) {
            let point = this.points[i];
            curveVertex(point.x + 10, point.y);
        }

        endShape();
    }
}