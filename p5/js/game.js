// live-server

// Parameters
let nPages = 100;
let numPeople = 10;

// Global player object
let player;

// Sprite info
let webGroup;
let pages = [];
let peopleGroup;
let people = []
let trashList = [];
let trashGroup;

// Viewbox stuff
let sideDrawer;
let viewWidth, viewHeight;
let drawerY;
let drawerHeight;
let nameIndex = 0;
let cursorImage;
let trashImage;

let sketch = function(p) {

    p.preload = function() {
        cursorImage = p.loadImage('../assets/cursor.png');
        trashImage = p.loadImage('../assets/datatrash-1.png');
        cookieImage = p.loadImage('../assets/cookie.png');
        // trashImage.resize(10, 0);
    }
        
     p.setup = function() {
        viewWidth = p.windowWidth * 3/5;
        viewHeight = p.windowHeight * 3/4;

        drawerY= viewHeight;
        drawerHeight = p.windowHeight - drawerY;

        sideDrawer = new SideDrawer(viewWidth, p.windowWidth - viewWidth, drawerY)

        player = new Player()

        p.smooth();
        canvas = p.createCanvas(p.windowWidth, p.windowHeight);

        // Define the sprite groups
        webGroup = p.Group();
        peopleGroup = p.Group();
        trashGroup = p.Group();

        // Create each page
        for (let i = 0; i < nPages; i++) {
            let page = new WebPage();
            pages.push(page);
            page.sprite.addToGroup(webGroup);
        }

        // Add connections between pages
        let numEdges = 250;
        for (let i = 0; i < numEdges; i++) {
            let page1 = pages[Math.floor(p.random(pages.length))];
            let page2 = pages[Math.floor(p.random(pages.length))];
            page1.edgeTo(page2)
        }

        // Update page sizes
        // for (let page of pages) {
        //     page.sprite.scale = page.size()
        // }

        //Create people
        for(let i = 0; i < numPeople; i++) {
            person = createPerson();
            people.push(person);
            person.sprite.addToGroup(peopleGroup);
        }
    }

    p.mouseClicked = function() {
        for(let page of pages) {
            if (page.sprite.overlapPoint(p.mouseX, p.mouseY)) {
                player.pageClicked = page;
                page.addCookie();
            }
        }
    }

    p.draw = function() {
        p.background(0, 0, 0);
        p.fill(0);

        for (let trash of trashList) {
            trash.accelerate();
        }

        for (let i = 0; i < trashList.length; i++) {
            let trash = trashList[i]
            if (trash.sprite.overlapPoint(p.mouseX, p.mouseY)) {
                trashList.splice(i, 1); // Remove the piece of trash
                trash.sprite.remove();
                player.heaps.push(new InventoryItem(trashImage, trash))
            }
        }

        // Move people
        for (let person of people) {
            person.move();
        }

        // Draw connections
        p.strokeWeight(0.5);
        p.stroke(255, 255, 255, 100)
        for (let page1 of pages) {
            for (let page2 of page1.edges) {
                p.line(page1.sprite.position.x, page1.sprite.position.y, 
                    page2.sprite.position.x, page2.sprite.position.y);
            }
        }

        // Draw pages
        webGroup.collide(webGroup);
        p.drawSprites();

        for (let page of pages) {
            if(page.cookie) {
                let sx = 50;
                let sy = 40;
                p.image(cookieImage, page.sprite.position.x - sx/2, page.sprite.position.y - sy/2, sx,sy);
            }
        }

        // Mouse hover card
        drawCard();
        
        drawDrawer();
        sideDrawer.draw();
    }

    class WebPage {
        constructor() {
            this.sprite = p.createSprite(p.random(viewWidth), p.random(viewHeight), 20, 20)
            let name = getSiteName();
            this.url = name[0];
            this.rank = name[1];
            this.edges = [];
            this.cookie = false;
            // this.setImage(this.url)
        }

        edgeTo(node) {
            this.edges.push(node);
        }

        size() {
            let m = p.map(this.rank, 1, nPages, 1, 10);
            return (13 - m) 
        }

        setImage(url) {
            // let image = p.loadImage('http://' + url + '/favicon.ico')
            let image = p.loadImage('../assets/icons/' + url + '.ico')
            // image.resize(32, 32);
            // this.sprite.width = 32;
            // this.sprite.height = 32;
            // p.print(url)
            // p.print(image.width)
            // this.sprite.scale = 1 / image.width;
            this.sprite.addImage(image);
        }

        randConnection() {
            // Returns a random page that is connected
            return this.edges[Math.floor(Math.random() * this.edges.length)]
        }

        addCookie() {
            this.cookie = true;
            player.cookiesPlaced++;
        }
    }

    function randWaitThreshold() {
        return [0.99, p.random(0.99, 0.99999999)]
    }
    
    function createPerson() {
        let onPage = pages[Math.floor(p.random(pages.length))];
        let person = new Person(onPage);
        return person
    }

    class Person {
        constructor(onPage) {
            this.onPage = onPage;
            this.toPage = null;
            this.pos = 0;
            this.sprite = p.createSprite(onPage.sprite.position.x, onPage.sprite.position.y, 10, 10);
            this.sprite.addImage('cursor', cursorImage)
            this.sprite.scale = 0.05;
            this.waitThreshold = randWaitThreshold();

            this.browsingHistory = []
            this.name = getName();
        }

        moveToPositionOnLine(i, onPage, toPage) {
            this.sprite.position = p5.Vector.lerp(onPage.sprite.position, toPage.sprite.position, i);
        }

        visitPage() {
            // Reset movement to a new page
            this.pos = 0;
            this.onPage = this.toPage;
            this.toPage = null;
            this.waitThreshold = randWaitThreshold()

            this.browsingHistory.push(this.onPage);

            // Generate data
            if (this.onPage.cookie) {
                this.spawnTrash();
            }
        }

        move() {
            if (this.toPage == null) {
                if (this.onPage.edges.length == 0) {
                    this.sprite.remove();
                    return;
                }
                // Find a new page to move to if don't have one
                this.toPage = this.onPage.randConnection();
            }

            this.moveToPositionOnLine(this.pos, this.onPage, this.toPage)

            if (this.pos < this.waitThreshold[1]) {
                this.pos = this.pos + (1 - this.pos ** 4) * 0.02;
            }
            else if (this.pos >= this.waitThreshold[0]) {
                this.visitPage();
            }
        }

        spawnTrash() {
            let trash = new Trash(this.onPage, this);
            trashList.push(trash);
            trash.sprite.addToGroup(trashGroup);
        }
    }

    class Trash {
        constructor(page, person) {
            this.sprite = p.createSprite(page.sprite.position.x, 
                page.sprite.position.y, 10, 10);
            this.sprite.addImage('trash', trashImage);
            this.sprite.scale = 0.09;
            this.sprite.setVelocity(p.random(-8, 8), p.random(-10, -5));
            this.data = person.browsingHistory.slice(0); // image of the current browsing history
        }

        accelerate() {
            this.sprite.velocity.y += 0.5
        }
    }

    class Player {
        constructor() {
            this.heaps = []; // the number of trash heaps you have
            this.cookiesPlaced = 0;
            this.money = 0;

            this.pageClicked = false;
        }
        get info() {
            return 'Cookies Placed ' + this.cookiesPlaced + '\n'
            
        }
    }

    class InventoryItem {
        constructor(image, item) {
            this.size = p.random(100, 300);
            this.image = p.createImage(this.size, this.size);
            // Create a copy of the image 
            this.image.copy(image, 0, 0, image.width, image.height, 0, 0, this.size, this.size);
            // Position it within the drawer
            this.x = p.random(0, viewWidth - this.image.width);
            this.y = viewHeight + p.random(0, drawerHeight - this.image.height);
            this.item = item
        }

        onHover() {
            let string = ''
            for (let page of this.item.data) {
                string += page.url + ' -> '
            }

            p.fill(p.color(0, 0, 0));
            let textSize = 20;
            p.textSize(textSize);
            p.text(string, p.mouseX + 30, p.mouseY, 400)
        }
    }

    function getSiteName() {
        // let rand = Math.floor(Math.random() * topsites.length)
        let val = [topsites[nameIndex], nameIndex++];
        return val;
    }

    function getName() {
        let commonNames = ['alex', 'david', 'name'];
        let rand = Math.floor(Math.random() * topsites.length)
        return commonNames[rand]
    }

    function drawCard() {
        for(let page of pages) {
            if (page.sprite.overlapPoint(p.mouseX, p.mouseY)) {
                text = page.url;
                let textSize = 32;
                p.textSize(textSize);
                let textLength = textSize * text.length

                p.fill(p.color(255, 255, 255));
                var cardx = page.sprite.position.x + 30;
                var cardy = page.sprite.position.y -75;
                var cardWidth = 400;
                var cardHeight = 100;
                // p.rect(cardx, cardy, cardWidth, cardHeight, 10);
    
                p.fill(p.color(255, 255, 255));
                p.text(text, p.mouseX + 30, p.mouseY + 1/2 * textSize);
    
                break; // Make sure we only draw one at a time
            }
        }
    }

    function drawDrawer() {
        p.strokeWeight(0);
        p.fill(p.color(255, 255, 255));
        p.rect(0, drawerY, p.windowWidth, drawerHeight);
        let trashWidth = 200;
        let trashHeight = 200;
        
        p.fill(p.color(0, 0, 0));
        p.textSize(32);
        p.text(player.heaps.length, 10, drawerY + drawerHeight / 2 - 16)

        // Draw inventory items
        for (let item of player.heaps) {
            p.image(item.image, item.x, item.y, item.image.width, item.image.height);
        }
        for (let item of player.heaps) {
            if(p.collidePointRect(p.mouseX, p.mouseY, item.x, item.y, item.image.width, item.image.height)) {
                item.onHover();
                break
            }
        }
    }

    class SideDrawer {
        constructor(x, width, height) {
            this.x = x;
            this.y = 0;
            this.width = width;
            this.height = height;
            this.currentTab = 'Security';
        }

        draw() {
            p.strokeWeight(0);
            p.fill(p.color(255, 255, 255, 255));
            p.rect(this.x, 0, this.width, this.height);
    
            if (player.pageClicked) {
                this.drawPagePage(player.pageClicked);
                this.currentTab = 'Data';
            }else if (this.currentTab == 'Security') {
                this.drawSecurity();
            }

            this.drawTabs();
        }

        drawSecurity() {
            p.fill(p.color(0, 0, 0));
            textCentered(player.info, this.x, this.y, this.width, this.height, 32);
        }

        drawTabs() {
            let names = ['Algorithms', 'Data', 'Security'];
            let numTabs = names.length;
            let width = this.width / numTabs;
            for (let i = 0; i < numTabs; i ++) {
                this.drawTab(this.x + i * width, width, names[i])
            }
        }

        drawTab(x, width, name) {
            let y = 0;
            let height = 100;
            if (p.collidePointRect(p.mouseX, p.mouseY, x, y, width, height)) {
                p.fill(p.color(100, 100, 100));
            } else {
                p.fill(p.color(200, 200, 200));
            }
            p.rect(x, y, width, height);
            p.fill(0)
            textCentered(name, x, y, width, height);
        }

        drawPagePage(page) {
            console.log(page.url)
            p.fill(0);
            textCentered(page.url + '\n' + page.cookie, this.x, this.y, this.width, this.height, 30);
        }
    }

    function textCentered(text, x, y, width, height, size) {
        if (!size)
            size = 22;
        p.textSize(size);
        let l = text.length * size / 2;
        p.text(text, x + (width / 2) - l / 2, y + height / 2 - size / 2, width, height)
    }


}

let myp5 = new p5(sketch);