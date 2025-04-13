let n = 1;
let fontSize = 20;
let offset, lineSpacing, fontScreenRatio;
let charWidth, charHeight;
let buffer = "";
let pastBuffers = [];
let numBuffers = 40;
let font;
let spaceWidth;

// let whichPoem = 'resistance';
let whichPoem = 'resistance_demo';
// let canon = ['wakeHour', 'light', 'wakeNoEase', 'now'];
let poem;
let poemWord = 0;

let leftBoundary, rightBoundary, pageWidth;
let startTime;
let lastWord;
let movingWords = [];
let wordPositions = []; // Added word position tracking

let time = 0;
const timeStep = 0.1;
const endModeMod = 0.5;
let frames = 0;
let endMode = false;
const timeBetween = 0.35; // time between the lines

const textWidthCache = new Map();

function createTextMapping(text) {
    const bracketPattern = /\[([^\]]+)\]/g;
    const mappings = {};
    
    let match;
    while ((match = bracketPattern.exec(text)) !== null) {
        const [first, ...rest] = match[1].split('|');
        if (mappings[first] != null) {
          console.log('warn collision', {first, 'existing': mappings[first], rest})
        }
        mappings[first] = rest;
    }
    
    console.log('mappings')
    console.log(mappings);
    
    return mappings;
}

function preload() {
  font = loadFont("fonts/VictorMono-Regular.ttf");
  
  whichPoem = whichPoem != null ? whichPoem : random(canon)
  
  poem = poems[whichPoem];
  poem = poem != null ? poem : random(poems);
  
  if (poem.file != null) {
    poem.text = "";
     loadStrings(poem.file, (lines) => {
        poem.text += lines.flatMap(line => line);
        console.log({text: poem.text})
      });
  }
}

function getNextWord(original) {
  console.log({original, 'new': poem.replacements[original]})
  if (poem.replacements[original] != null) {
    const options = poem.replacements[original];
    const next = options.shift();  // Take the first item
    options.push(next);           // Put it at the back
    return next;
  }
  return original;
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  leftBoundary = width / 5;
  rightBoundary = width - leftBoundary;
  pageWidth = width - 2 * leftBoundary;

  offset = fontSize / n;
  lineSpacing = fontSize / 2;

  textAlign(CENTER, CENTER);
  textFont(font);
  textSize(fontSize);
  fontScreenRatio = height / fontSize;

  startTime = millis();
  spaceWidth = textWidth(" ");
  
  poem.replacements = createTextMapping(poem.text);
}

function getCachedTextWidth(text) {
  if (!textWidthCache.has(text)) {
    textWidthCache.set(text, textWidth(text));
  }
  return textWidthCache.get(text);
}

function calculateWordPosition(text, upToWord = null) {
  const words = text.split(" ");
  let [curX, curY] = [leftBoundary, leftBoundary];
  let lastCharWidth;
  let wordWidth;

  for (let w = 0; w < words.length; w++) {
    const word = words[w];
    wordWidth = getCachedTextWidth(word);
    
    if (curX + wordWidth > rightBoundary) {
      curX = leftBoundary;
      curY += fontSize + lineSpacing;
    }

    // If this is the word we're looking for, return its position
    if (word === upToWord) {
      return {
        x: curX + wordWidth/2,  // Center of word
        y: curY
      };
    }

    // Move past this word
    curX += wordWidth;
    curX += spaceWidth;
    lastCharWidth = getCachedTextWidth(word[word.length - 1]);
  }

  // Return position for end of text if no specific word found
  return {
    x: curX - wordWidth/2 - spaceWidth/2 - lastCharWidth,
    y: curY
  };
}
function findMatchingReplacement(buffer, replacements) {
  // Get all possible replacement keys
  const keys = Object.keys(replacements);
  
  // Sort by length (longest first) to ensure we match longest possible pattern
  keys.sort((a, b) => b.length - a.length);
  
  // Check if the end of the buffer matches any replacement key
  for (const key of keys) {
    if (buffer.endsWith(key)) {
      return {
        match: key,
        start: buffer.length - key.length,
        replacement: replacements[key]
      };
    }
  }
  
  return null;
}

function keyPressed() {
  if (key === "Backspace") {
    buffer = buffer.slice(0, -1);
    if (buffer[buffer.length - 1] === " ") {
      wordPositions.pop();
    }
    return false;
  }

  if (key === "Enter") {
    endMode = true;
    return false;
  }

  if (key.length !== 1) {
    return false;
  }
  
  const prevLoc = pastBuffers[pastBuffers.length-1]?.loc || [0, 0];
  pastBuffers.push({buffer, loc: prevLoc});
  pastBuffers = pastBuffers.slice(-numBuffers)
  console.log({num: pastBuffers.length})
  

  buffer += key;
  // time += timeStep;

  const match = findMatchingReplacement(buffer, poem.replacements);
  if (match) {
    const newWord = getNextWord(match.match);
    
    if (newWord === match.match) {
      return false;
    }

    wordPositions.push({
      start: match.start,
      length: match.match.length,
      replacement: newWord,
      id: Date.now()
    });

    const wordWidth = getCachedTextWidth(newWord);
    const originalWordWidth = getCachedTextWidth(match.match);
    const widthRatio = pageWidth / 2 / wordWidth;
    const heightRatio = height / 2 / fontSize;
    const targetScale = min(1, min(widthRatio, heightRatio));

    const newWords = Array(n)
      .fill(null)
      .map((_, i) => ({
        wordId: wordPositions[wordPositions.length - 1].id,
        text: newWord,
        originalText: match.match,
        lengthDiff: wordWidth - originalWordWidth,
        startX: 0,
        startY: 0,
        startScale: 1,
        targetX: lastWord.x,
        targetY: lastWord.y,
        targetXA: lastWord.x - originalWordWidth / 2 + wordWidth / 2,
        targetYA: lastWord.y,
        targetScale: targetScale,
        startTime: time + i * timeBetween,
      }));

    movingWords.push(...newWords);
  }doRestasdfasdfasdfasdfasdfdfd

  return false;
}

function doReset() {
  buffer = "";
  time = 0;
  movingWords = [];
  wordPositions = []; // Reset word positions
  textWidthCache.clear(); // Clear cache on reset
  endMode = false;
}

function drawLerpWords(movingWords, t, endMode) {
  let filteredWords = [];

  movingWords.forEach((word) => {
    const progress = Math.min(1, Math.max(0, t - word.startTime));
    if (progress <= 0 && endMode) return;
    if (progress <= 0) {
      filteredWords.push(word);
      return;
    }
    
    if(!word.completed) {
        push();
        const progress2 = progress * progress;

        // Basic linear interpolation
        const baseX = lerp(word.startX, word.targetXA, progress);
        const baseY = lerp(word.startY, word.targetYA, progress);

        // Add circular motion that fades out as progress increases
        const radius = 50 * (1 - progress); // radius gets smaller as we progress
        const angle = progress * 12; // complete ~2 rotations during animation
        const offsetX = radius * Math.sin(angle);
        const offsetY = radius * Math.cos(angle);

        // Combine the linear motion with the circular motion
        const x = baseX + offsetX;
        const y = baseY + offsetY;

        const s = lerp(word.startScale, word.targetScale, progress2);
        translate(x, y);
        scale(s);
        fill(0);
        text(word.text, 0, 0);
        pop();
    }
    
    if (progress >= 1) {
      if (!word.completed) {
        word.completed = true;
        const wordPosition = wordPositions.find(pos => pos.id === word.wordId);
        if (wordPosition) {
          // Calculate how much this replacement will shift future positions
          const lengthDifference = word.text.length - wordPosition.length;
          
          // Get the buffer before and after the word
          const beforeWord = buffer.substring(0, wordPosition.start);
          const afterWord = buffer.substring(wordPosition.start + wordPosition.length);
          
          // Build the new buffer with proper spacing
          let newBuffer = beforeWord;
          newBuffer += word.text;
          newBuffer += afterWord;
          
          // Update the buffer
          buffer = newBuffer;
          
          // Update this word's length
          wordPosition.length = word.text.length;
          
          // Calculate the actual shift amount including any added spaces
          const actualShift = newBuffer.length - buffer.length;
          
          // Update ALL future word positions
          wordPositions.forEach(pos => {
            if (pos.start > wordPosition.start) {
              pos.start += lengthDifference;
            }
          });
          
          // Update target positions for animating words
          movingWords.forEach(otherWord => {
            if (otherWord === word) return;
            const otherPosition = wordPositions.find(pos => pos.id === otherWord.wordId);
            if (otherPosition && otherPosition.start > wordPosition.start) {
              // Instead of using substring up to length, we'll construct the text
              // up to this specific instance of the word by using the exact position
              const textUpToWord = buffer.substring(0, otherPosition.start);
              const position = calculateWordPosition(textUpToWord + otherWord.text);

              // Update the target positions for the animation
              otherWord.targetXA = position.x;
              otherWord.targetYA = position.y;
            }
          });
        }
      }
      
      if (endMode) {
        if (word.deleteTime === undefined) word.deleteTime = t;
        if (t < word.deleteTime) {
          filteredWords.push(word);
        }
      } else {
        filteredWords.push(word);
      }
    } else {
      filteredWords.push(word);
    }
  });
  
  return filteredWords;
}

function drawCurrentText(buffer, leftBoundary, rightBoundary, fontSize, lineSpacing) {
  fill(0);
  // fill(0, 0, 0, 100);
  const words = buffer.split(" ");
  let [curX, curY] = [leftBoundary, leftBoundary];
  let lastCharWidth;

  let wordWidth;
  for (let w = 0; w < words.length; w++) {
    word = words[w];
    wordWidth = getCachedTextWidth(word);
    if (curX + wordWidth > rightBoundary) {
      curX = leftBoundary;
      curY += fontSize + lineSpacing;
    }

    for (const char of word) {
      lastCharWidth = getCachedTextWidth(char);
      push();
      translate(curX, curY);
      text(char, 0, 0);
      pop();
      curX += lastCharWidth;
    }
    curX += spaceWidth;
  }

  return calculateWordPosition(buffer);
}


function drawPastText(buffer, index, leftBoundary, rightBoundary, fontSize, lineSpacing) {
  fill(0, 0, 0, index * 10);
  const words = buffer.split(" ");
  let [curX, curY] = [leftBoundary, leftBoundary];
  let lastCharWidth;

  let wordWidth;
  for (let w = 0; w < words.length; w++) {
    word = words[w];
    wordWidth = getCachedTextWidth(word);
    if (curX + wordWidth > rightBoundary) {
      curX = leftBoundary;
      curY += fontSize + lineSpacing;
    }

    for (const char of word) {
      lastCharWidth = getCachedTextWidth(char);
      push();
      translate(curX, curY);
      text(char, 0, index * lineSpacing * 2 * 3);
      pop();
      curX += lastCharWidth;
    }
    curX += spaceWidth;
  }
}

function draw() {
  if (endMode && movingWords.length == 0) {
    doReset();
  }

  fill(255);
  // noStroke(0)
  background(200);
  rect(
    leftBoundary / 2,
    leftBoundary / 2,
    windowWidth - leftBoundary,
    windowHeight
  );

  // if (endMode) {
    time += timeStep * endModeMod;
  // }
  
  const t = time;

  movingWords = drawLerpWords(movingWords, t, endMode);
  
  for(let b = 0; b < pastBuffers.length; b++) {
     let buff = pastBuffers[b].buffer
     drawPastText(
      buff,
      pastBuffers.length - b,
      leftBoundary,
      rightBoundary,
      fontSize,
      lineSpacing
    );
  }
  
  lastWord = drawCurrentText(
    buffer,
    leftBoundary,
    rightBoundary,
    fontSize,
    lineSpacing
  );
}