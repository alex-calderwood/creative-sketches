let pg;
let image_names = [
    '../assets/processed_patents/1_television-system.png', 
    '../assets/processed_patents/2_file-cabinet.png', 
    '../assets/processed_patents/3_tape-recorder.png', 
    '../assets/processed_patents/4_calculating-machine.png', 
    '../assets/processed_patents/5_cell-network.png', 
    '../assets/processed_patents/6_x-ray-apparatus.png', 
    '../assets/processed_patents/7_film-reel.png', 
    '../assets/processed_patents/8_printing-press.png', 
    '../assets/processed_patents/9_motion-picture-camera.png',
    '../assets/processed_patents/S1_type-writing.png',
    '../assets/processed_patents/S2_sound-waves.png',
    '../assets/processed_patents/S3_tree.png',
    '../assets/processed_patents/S4_ai-processor.png',
];

let screenWidth = 3840;
let screenHeight = 910;

let speed0 = 0.0008;
let speed1 = 0.007;
let speed2 = 0.003;

let images = [];
let center;

let fr = 30; // framerate
let frame = 0;

let base_spawn_rate = 60;
let spawn_variance = 60;
let spawn_rate = base_spawn_rate;

function preload(){
    for (let i of image_names) {
        images.push(new MovingImage(i));
    }
}

function setup() {   
    
    print('framerate', fr, 'spawn', base_spawn_rate, '+-', spawn_variance)

    smooth();
    canvas = createCanvas(screenWidth, screenHeight);
    pg = createGraphics(screenWidth, screenHeight);
    dom_canvas = canvas.canvas;

    pg.rectMode(CENTER); 
    pg.imageMode(CENTER);
    center = createVector(screenWidth / 2, screenHeight / 2);
    frameRate(fr);

    for (let i of images) {
        i.onLoad()
    }
    spawnNewImage();
}

function draw() {

    if (keyIsDown(SHIFT)) {
        frameRate(fr * 10);
        print('down')
    } else {
        frameRate(fr);
    }

    pg.background(0);
    for (let patent_image of images) {
        if(patent_image.active) {
            patent_image.draw();
        }
    }
    frame++;

    if (frame % spawn_rate == 0) {
        spawnNewImage();
        spawn_rate = base_spawn_rate + random(-spawn_variance, spawn_variance) 
    }

    image(pg, 0, 0)
}

function spawnNewImage() {

    print('spawning image')

    let inUse = true;
    let index;
    while(inUse) {
        index = Math.floor(Math.random() * images.length)
        inUse = images[index].active;
    }
    
    images[index].reset();
    images[index].active = true;
}

class MovingImage {
    states = ['in', 'out', 'done'];

    constructor(path) {
        this.image = loadImage(path);
        this.position = createVector(100, 100);
        this.active = false;

        this.scale_mod = 7; // inverse scale
    }

    onLoad() {
        this.state = 0; // in, out, done

        this.origin_width = this.image.width;
        this.origin_height = this.image.height;

        this.width = this.origin_width / this.scale_mod;
        this.height = this.origin_height / this.scale_mod;

        let y = random(this.height / 4, screenHeight - this.height / 4)
        let origin_x = - this.width;
        let dest_x = random(this.width / 2, screenWidth - this.width / 2)

        this.origin = createVector(origin_x, y);
        this.destination = createVector(dest_x, y);

        this.linear_position_index = 0;
        this.speed = speed0;

        this.dest_scale = random(1.2, 2.3);

        this.dest_width = this.image.width;
        this.dest_height = this.image.height;

        // set easing function
        this.easing = EasingFunctions.easeInOutCubic;

        this.speed_pause = random(speed1, speed2);

        // this.easing = function easing(pos) {
        //     return pos + (1 - Math.pow(pos, 1/2)) * this.speed;
        // }
    }

    reset() {
        this.onLoad();
        this.position = this.origin;
    }

    draw() {
        pg.image(this.image, this.position.x, this.position.y, this.width, this.height);
        this.move();
    }

    move() {

        // Set the position to be drawn via interpolation between two points
        this.position = p5.Vector.lerp(this.origin, this.destination, this.position_index);

        if (1 - this.position_index < 0.001) {

            print('finished state', this.state, 'dest', this.dest_width, this.dest_height)
            
            // At the end of the current animation loop
            if (this.state == 0) {
                // Zoom
                this.speed = speed1;
                this.origin = this.position;
                let translation_factor = 0.5;
                this.destination = p5.Vector.add(this.position, createVector(random(-this.width * translation_factor, this.width * translation_factor), random(-this.height * translation_factor, this.height * translation_factor)));
                this.dest_width = this.image.width * this.dest_scale; // do scale;
                this.dest_height = this.image.height * this.dest_scale;
                
                // if (random() > 0.25) {
                    // this.easing = EasingFunctions.easeInOutBack
                // }
                this.state++;
            }
            else if (this.state == 1) {
                // Pause
                this.speed = this.speed_pause;
                this.origin = this.position;
                this.destination.x = this.position;
                
                this.origin_width = this.dest_width; // keep at the current scale;
                this.origin_height = this.dest_height;
                this.state++;
                spawnNewImage()
            }
            else if (this.state == 2) {
                // Move off frame
                this.speed = speed2;
                this.easing = EasingFunctions.easeInCubic;
                this.origin = this.position;
                this.destination.x = this.position.x + screenWidth * 1.3;
                
                this.origin_width = this.dest_width; // keep at the current scale;
                this.origin_height = this.dest_height;
                this.state++;
            }
            else if (this.state == 3) {
                // disapear and reset
                this.active = false;
                this.speed = speed0;
            }

            this.linear_position_index = 0;
        }

        // Nonlinear smoothing
        this.linear_position_index = (this.linear_position_index + this.speed);
        this.position_index = this.easing(this.linear_position_index);

        // Interpolate the size
        this.width = lerp(this.origin_width, this.dest_width, this.position_index) / this.scale_mod;
        this.height = lerp(this.origin_height, this.dest_height, this.position_index) / this.scale_mod;

        // this.position_index = (this.position_index + this.speed);
        // if (this.position_index > 1) {
        //     this.position_index -= 1;
        // }
    }
}

EasingFunctions = {
    // no easing, no acceleration
    linear: function (t) { return t },
    // accelerating from zero velocity
    easeInQuad: function (t) { return t*t },
    // decelerating to zero velocity
    easeOutQuad: function (t) { return t*(2-t) },
    // acceleration until halfway, then deceleration
    easeInOutQuad: function (t) { return t<.5 ? 2*t*t : -1+(4-2*t)*t },
    // accelerating from zero velocity 
    easeInCubic: function (t) { return t*t*t },
    // decelerating to zero velocity 
    easeOutCubic: function (t) { return (--t)*t*t+1 },
    // acceleration until halfway, then deceleration 
    easeInOutCubic: function (t) { return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1 },
    // accelerating from zero velocity 
    easeInQuart: function (t) { return t*t*t*t },
    // decelerating to zero velocity 
    easeOutQuart: function (t) { return 1-(--t)*t*t*t },
    // acceleration until halfway, then deceleration
    easeInOutQuart: function (t) { return t<.5 ? 8*t*t*t*t : 1-8*(--t)*t*t*t },
    // accelerating from zero velocity
    easeInQuint: function (t) { return t*t*t*t*t },
    // decelerating to zero velocity
    easeOutQuint: function (t) { return 1+(--t)*t*t*t*t },
    // acceleration until halfway, then deceleration 
    easeInOutQuint: function (t) { return t<.5 ? 16*t*t*t*t*t : 1+16*(--t)*t*t*t*t },

	// easeInOutBack: function (t) {
    //     let c = 1.0
    //     let d = 
    //     let s = 1.70158; 
	// 	if ((t/=d/2) < 1) return c/2*(t*t*(((s*=(1.525))+1)*t - s));
	// 	return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2);
    // },
    
    // https://github.com/danro/easing-js/blob/master/easing.js

    easeInOutBack: function(pos) {
        var s = 1.70158;
        if((pos/=0.75) < 1) return 0.75*(pos*pos*(((s*=(1.525))+1)*pos -s));
        return 0.75*((pos-=2)*pos*(((s*=(1.525))+1)*pos +s) +2);
      },
    

    // -0.75 * sin(x + 2 * PI / 3) - 0.75 * sin(x/2 + 2*PI /3) 
    //𝑦=𝑢0(1−𝑥)3+3𝑢1(1−𝑥)2𝑥+3𝑢2(1−𝑥)𝑥2+𝑢3𝑥3
    // cameraZoom: function(t) { 
    //     let u0 = 0.01;
    //     let u1 = 1.3;
    //     let u2 = 1;
    //     return  u0(1 - t)*3 + 3*u1(1-t) + 3 * u2(1-t)*2
    // }

  }
