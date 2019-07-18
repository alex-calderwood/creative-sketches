let web;
let colors;

function setup() {
    canvas = createCanvas(windowWidth, windowHeight);

    cameraZ = Math.max(windowWidth, windowHeight);
    focusPoint = cameraZ - focusDist;
    cameraPos = createVector(windowWidth / 2, windowHeight / 2, cameraZ);

    web = new Web(60);

    frameRate(1);

    background(color(0, 0, 0));

//    alph = 10
    alph = 5
    stroke(color(255, 255, 255, alph))
    strokeWeight(0.0005)

    colors = uniformSaturationColors(alph);

//  Render scene
    web.render();

    print('Focus Distance', focusDist)
    print('CameraZ', cameraZ)
    print('Focus Point', focusPoint)
    print('Camera', cameraPos.x, cameraPos.y, cameraPos.z)
    print('Min', web.minDist, web.minp)
    print('Max', web.maxDist, web.maxp)
}

function draw() {
    // Too slow
    //    background(color(0, 0, 0));
    //    let n = 0;
    //
    //    for (let i = 0; i < web.n; i++) {
    //        let page = web.pages[i];
    //        let dz = noise(n += 0.01) * 100;
    //        page.moveInZ(dz);
    //    }
    //    web.render();
}

class Web {

    constructor(n) {
        this.n = n;
        this.pages = [];

        let zRange = [-focusPoint * 2, focusPoint * 2];

        for (let i = 0; i < this.n; i++) {
            this.pages.push(new Page());
        }

        // Add some connections
        for(let i = 0; i < 10; i++) {
            for(let j = this.n - 1; j > this.n - 20; j--) {
                let page1 = this.pages[i];
                let page2 = this.pages[j];
                page1.addEdgeBetween(page2);
            }
        }

        // Set min / max Z depth
        this.minDist = Infinity;
        this.maxDist = - Infinity;
        for (let struct of this.pages) {
            if(struct.minDist < this.minDist) {
                this.minDist = struct.minDist;
            }

            if(struct.maxDist > this.maxDist) {
                this.maxDist = struct.maxDist;
            }
        }
    }

    render() {
        let i = 0;
        for (let p of this.pages) {
            p.render();
        }
    }
}

class Page extends FocusStructure {
    constructor() {

        // Determine the edge locations
        let x = random(windowWidth);
        let y = random(windowHeight);

        // Sample from a gaussian distribution
        let std = 2;
        let gauss = - Math.floor(Math.abs(randomGaussian(0, std)));
//        let gauss = - (Math.abs(randomGaussian(0, std)));
        let z = gauss * focusPoint + (focusPoint);

        // Change the size of the square based on the depth
        let scale = 10 * gauss;
        let width = 100 + scale;
        let height = 100 + scale;

        // Make a square
        let edges = [];
        let p1 = createVector(x, y, z);
        let p2 = createVector(x + width, y, z);
        let p3 = createVector(x + width, y + height, z);
        let p4 = createVector(x, y + height, z)
        edges[0] = [p1, p2];
        edges[1] = [p2, p3];
        edges[2] = [p3, p4];
        edges[3] = [p4, p1];

        // Instantiate the FocusStructure parent.
        super(edges)

        this.outEdges = []
    }

    render() {
//        super.render()
        for (let e of this.outEdges) {
            e.render();
        }
    }

    addEdgeBetween(page) {
        let edge = new FocusLine(this.x, this.y, this.z, page.x, page.y, page.z);
        this.outEdges.push(edge);
    }
}