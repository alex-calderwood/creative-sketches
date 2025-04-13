console.log('sketch.js loaded');
let [u, v] = [56, 40];
let screen;
let seed = false;
let overlayWords = [];
let charWidth, charHeight;
let defaultSize = 20;
let fontSize;
let frame = 0;
let showCursor = true;
let emit = true;
let movingWords = [];

const mod = (n, m) => ((n % m) + m) % m; // 'true mod' that allows negative numbers too

const grammar = [
  {
    id: 'go',
    children: [{
      id: 'runner'
    }],
  },
  {
    id: 'start',
    children: [{
      id: 'runner'
    }],
  },
  {
    id: 'runner',
    delete: 'stop',
    children: [{
      id: 'ran'
    }]
  },
];
  

// Helper function to get random element from array
const random = arr => arr[Math.floor(Math.random() * arr.length)];

// Main expansion function
const expand = (text, rules = grammar) => {
  // Base case: if no more tokens to expand, return the text
  if (!text.includes('#')) return text;
  
  // Replace one token at a time
  return expand(
    text.replace(/#(\w+)#/, (match, token) => {
      if (!rules[token]) {
        console.warn(`No rule found for token: ${token}`);
        return match;
      }
      return random(rules[token]);
    }),
    rules
  );
};

let poem;
let poems = [
  {
    text: "cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloudcloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloudcloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloudcloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud cloud",
    period: 60,
    orientation: 'CENTER',
    ghost: 0,
    font: 'VictorMono-Regular.ttf',
    size: 20,
  },
]

let [curU, curV] = [u / 2,v / 4];

function preload() {
  poem = poem != null ? poem : poems[0];

  // ticks = poem.period * framerate; // ticks per cycle
  
  font = poem.font ? loadFont(poem.font) : loadFont('VictorMono-Regular.ttf');
  
  overlayWords = seed ? [
    {text: 'bird', x: 10, y: 10},
    {text: 'bird', x: 10, y: 10},
    {text: 'bird', x: 10, y: 10},
  ] : [];
  
  const orientations = {
    'LEFT': LEFT,
    'RIGHT': RIGHT,
    'CENTER': CENTER
  }
  
  poem.orientation = poem.orientation ? 
    orientations[poem.orientation] 
    : LEFT;
  
  words = poem.text.split(' ');
  word = words[0];
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont(font);
  fontSize = poem.size ? poem.size : defaultSize;
  textSize(fontSize);
  fontWidth = textWidth('m');
  
  charWidth = fontWidth;
  charHeight = fontSize;
  
  u = floor(width / charWidth);
  v = floor(height / charHeight);
  
  background(255);
  screen = [];
  // overlay = [];
  for(let i = 0; i < u; i++) {
    screen.push([]);
    // overlay.push([]);
    for (let j = 0; j < v; j++) {
      screen[i].push(` `);
      // overlay[i].push(' ');
    }
  }
  
  if (seed) {
    for (let w = 0; w < words.length; w++) {
      let word = words[w];
      for(let c = 0; c < word.length; c++) {
        screen[curU + c][curV] = word[c];
      }
      curU += random([-1, 1]);
      curV += random([-1, 1]);
    }
  }
  
  console.log({orientation: poem.orientation, charWidth, charHeight})
}

function toOverlay(overlayWords) {
  let overlay = [];
  for(let i = 0; i < u; i++) {
    overlay.push([]);
    for (let j = 0; j < v; j++) {
      overlay[i].push(' ');
    }
  }
  
  for(let word of overlayWords) {
    for (let c = 0; c < word.text.length; c++) {
      overlay[mod(word.x + c, u)][mod(word.y, v)] = word.text[c];
    }
  }
  
  return overlay;
}

function enliven() {
  let emitted = false;
  for(let rule of grammar) {
    const word = rule.text || rule.id;
      for(let j = 0; j < v; j++) {
        for(let i = 0; i < u; i++) {
          // Check if we have enough space horizontally
          if (i + word.length <= u) {
            let slice = '';
            for (let k = 0; k < word.length; k++) {
              slice += screen[i + k][j];
            }

            // If we found the word
            if (slice === word && emit != false) {
              console.log(`Found word ${rule.id} at position`, i, j);
              // Clear the word from the screen
              for(let k = 0; k < word.length; k++) {
                emitted = true;
                // screen[i + k][j] = ' ';
              }
              
              if (rule.children != null) {
                const child = random(rule.children)
                overlayWords.push({
                  text: child.id,
                  x: i,
                  y: j
                });
              }
            }
          }
        }
      }
  }
  
  if (emitted) {
    emit = false;
  }
}

function keyPressed() {
  
//   if (![LEFT_ARROW, RIGHT_ARROW, UP_ARROW, DOWN_ARROW].includes(keyCode)) {
//     return;
//   }
  switch(keyCode) {
    case LEFT_ARROW: 
      curU --;
      break;
    case RIGHT_ARROW:
      curU ++;
      break;
    case UP_ARROW:
      curV --;
      break;
    case DOWN_ARROW: case ENTER:
      curV ++;
      break;
    case BACKSPACE:
      curU --;
      screen[curU][curV] = " "
      break
  }
  
  if (key === "Enter") {
    endMode = true;
    return false;
  }
  
  if (key.length !== 1) {
    return false;
  }
  
  
  if (key === " ") {
    
  }
  
  screen[curU][curV] = key;
  curU ++;
  
  return false;
}

function mousePressed(event) {
  curU = floor(event.x / charWidth);
  curV = floor(event.y / charHeight);
  console.log({curU, curV, x: event.x, y: event.y, u, v})
}

function draw() {
  textAlign(CENTER, TOP);
  background(255);
  fill(0);
  let w = 0;
  let s = 0;
  
  enliven();
  let overlay = toOverlay(overlayWords);
  
  for (let j = 0; j < v; j++) {
    for(let i = 0; i < u; i++) {
      if (overlay[i][j] != ' ' && screen[i][j] != ' ') {
        text(screen[i][j], i * charWidth  + charWidth / 2, j * charHeight);
      } else if (overlay[i][j] != ' ' ) {
        text(overlay[i][j], i * charWidth  + charWidth / 2, j * charHeight);
      } else {
        text(screen[i][j], i * charWidth  + charWidth / 2, j * charHeight);
      }
    }
  }
  
  let updateOverlay = frame % 10 == 0;
  if (updateOverlay) {
    for(let word of overlayWords) {
      word.x = word.x + random([-1]);
      // word.y = word.y + random([0, 0, 0, 0, 0, 0, 0, 0, 1, -1]);
    }
  }
  
  let spd = 100;
  if (showCursor && frame % spd < spd/2) {
    fill(100)
    rect(curU * charWidth , curV * charHeight, charWidth , charHeight);
  }
  
  if (frame % 200 == 0) {
    emit = true
  }
  
  frame++;
}
