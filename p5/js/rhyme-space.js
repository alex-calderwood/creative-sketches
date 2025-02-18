let lines;
let onlyLast = true;

function preload() {
  lines = loadStrings('../js/lines.txt');
  frameRate(.3)
}
function setup() {
  createCanvas(windowWidth, windowHeight);
}
function draw() {
  background(240, 240, 250);
  textSize(16);
  noStroke();
  textAlign(LEFT, TOP);
  
  let newLines = [];
  for (let i = 0; i < lines.length; i++) {
    let words = lines[i].split(" ");
    words = words.filter(w => w !== '');
    
    let newLine = "";
    
    for (let j = 0; j < words.length; j++) {
      let word = words[j];
      let rhymes = pronouncing.rhymes(word);
      
      if (!onlyLast || j == words.length - 1) {
        if (rhymes.length > 0) {
          let rhyme = rhymes[Math.floor(Math.random() * rhymes.length)];
          word = rhyme;
        }
      }
      newLine += word + " ";
    }
    
    newLines.push(newLine);
  }
  
  lines = newLines;
      
  for (let i = 0; i < lines.length; i++) {
    let words = lines[i].split(" ");
    let currentOffset = 0;
    for (let j = 0; j < words.length; j++) {
      let word = words[j];
      let wordWidth = textWidth(word);
      
      // fill(128+(i*10));
      // rect(25+currentOffset, 25+i*20,
        // wordWidth, 16);
      // if (mouseIsPressed) {
      // fill(0);
      text(word, 25+currentOffset, 25+i*20);
      // }
      // four pixels between words
      currentOffset += wordWidth + 4;
    }
  }
}