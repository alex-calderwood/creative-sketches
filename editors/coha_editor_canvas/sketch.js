let n = 1;
let fontSize = 20;
let offset, lineSpacing, fontScreenRatio;
let charWidth, charHeight;
let buffer = "";
let pastBuffers = [];
let numBuffers = 40;
let font = "20px monospace"; // Default font until loaded
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

// Canvas and context
let canvas, ctx;
let animationFrameId;
let fontLoaded = false;
let hiddenInput; // Hidden input element for focus and clipboard operations

function createTextMapping(text) {
    const bracketPattern = /\[([^\]]+)\]/g;
    const mappings = {};
    
    let match;
    while ((match = bracketPattern.exec(text)) !== null) {
        const [first, ...rest] = match[1].split('|');
        if (mappings[first] != null) {
          console.log('warn collision', {first, 'existing': mappings[first], rest});
        }
        mappings[first] = rest;
    }
    
    console.log('mappings');
    console.log(mappings);
    
    return mappings;
}

function loadFont(fontPath) {
    return new Promise((resolve, reject) => {
        const fontName = fontPath.split('/').pop().split('.')[0]; // Extract name from path
        const newFont = new FontFace(fontName, `url(${fontPath})`);
        
        newFont.load()
            .then(loadedFont => {
                document.fonts.add(loadedFont);
                font = `${fontSize}px ${fontName}`;
                fontLoaded = true;
                resolve(fontName);
            })
            .catch(err => {
                console.warn("Failed to load font:", err);
                resolve(null); // Resolve with null instead of rejecting
            });
    });
}

// Simplified text file loading with async/await
async function loadStrings(filePath) {
    try {
        const response = await fetch(filePath);
        const text = await response.text();
        return text.split('\n');
    } catch (error) {
        console.error('Error loading file:', error);
        return []; // Return empty array on error
    }
}


async function init() {

    canvas = document.getElementById('canvas') || document.querySelector('canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        document.body.appendChild(canvas);
    }
    
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    
    // Add high-DPI support
    setupHiDPI();
    
    // Set canvas size to window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    // Create hidden input for focus and clipboard operations
    hiddenInput = document.createElement('textarea');
    hiddenInput.style.position = 'absolute';
    hiddenInput.style.opacity = '0';
    hiddenInput.style.pointerEvents = 'none';
    hiddenInput.style.zIndex = '-1';
    hiddenInput.style.width = '0';
    hiddenInput.style.height = '0';
    hiddenInput.style.padding = '0';
    hiddenInput.style.border = 'none';
    hiddenInput.style.outline = 'none';
    hiddenInput.autocomplete = 'off';
    hiddenInput.autocorrect = 'off';
    hiddenInput.autocapitalize = 'off';
    hiddenInput.spellcheck = false;
    document.body.appendChild(hiddenInput);
    
    // Load font - simplified call
    await loadFont("fonts/VictorMono-Regular.ttf");
    
    // Initialize variables - use logical (CSS) dimensions, not scaled canvas dimensions
    leftBoundary = window.innerWidth / 5;
    rightBoundary = window.innerWidth - leftBoundary;
    pageWidth = window.innerWidth - 2 * leftBoundary;

    offset = fontSize / n;
    lineSpacing = fontSize / 2;

    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fontScreenRatio = canvas.height / fontSize;

    startTime = performance.now();
    spaceWidth = measureTextWidth(" ");
    
    // Load poem
    whichPoem = whichPoem != null ? whichPoem : (canon && canon.length > 0) ? canon[Math.floor(Math.random() * canon.length)] : null;
    
    poem = poems[whichPoem];
    poem = poem != null ? poem : Object.values(poems)[Math.floor(Math.random() * Object.values(poems).length)];
    
    if (poem.file != null) {
        poem.text = "";
        const lines = await loadStrings(poem.file);
        poem.text = lines.join('');
        console.log({text: poem.text});
        poem.replacements = createTextMapping(poem.text);
        // Start animation loop
        startAnimationLoop();
    } else {
        poem.replacements = createTextMapping(poem.text);
        // Start animation loop
        startAnimationLoop();
    }
    
    // Set up event listeners
    setupEventListeners();
}

function setupEventListeners() {
    // Canvas click focuses the hidden input
    canvas.addEventListener('click', () => {
        hiddenInput.focus();
    });
    
    // Focus hidden input on page load
    hiddenInput.focus();
    
    // Key events
    hiddenInput.addEventListener('keydown', handleKeyDown);
    
    // Input event for general text input (handles paste, IME, etc.)
    hiddenInput.addEventListener('input', handleInput);
    
    // Composition events for IME input
    hiddenInput.addEventListener('compositionstart', handleCompositionStart);
    hiddenInput.addEventListener('compositionend', handleCompositionEnd);
    
    // Prevent browser shortcuts
    document.addEventListener('keydown', preventBrowserShortcuts, true);
    
    // Window resize
    window.addEventListener('resize', handleResize);
}

// Prevent browser shortcuts that would interfere with the editor
function preventBrowserShortcuts(event) {
    // Prevent browser shortcuts like reload, find, save
    if (event.ctrlKey && (
        event.key === 'r' || // Prevent reload
        event.key === 'f' || // Prevent find
        event.key === 's' || // Prevent save
        event.key === 'p'    // Prevent print
    )) {
        event.preventDefault();
        event.stopPropagation();
    }
}

// Handle composition events for IME input
let isComposing = false;
function handleCompositionStart() {
    isComposing = true;
}

function handleCompositionEnd(event) {
    isComposing = false;
    // Process the final composition
    processTextInput(event.data);
    // Clear the hidden input
    hiddenInput.value = '';
}

// Handle general text input
function handleInput(event) {
    // Skip if we're in the middle of an IME composition
    if (isComposing) return;
    
    // Process the input
    if (event.inputType === 'insertText') {
        processTextInput(event.data);
    } else if (event.inputType === 'insertFromPaste') {
        // Handle paste - we'll just take the first character for simplicity
        if (hiddenInput.value.length > 0) {
            processTextInput(hiddenInput.value.charAt(0));
        }
    }
    
    // Clear the hidden input
    hiddenInput.value = '';
}

// Process text input (single characters)
function processTextInput(text) {
    if (!text || text.length === 0) return;
    
    // For simplicity, we'll just process the first character
    const char = text.charAt(0);
    
    const prevLoc = pastBuffers[pastBuffers.length-1]?.loc || [0, 0];
    pastBuffers.push({buffer, loc: prevLoc});
    pastBuffers = pastBuffers.slice(-numBuffers);
    
    buffer += char;
    
    const match = findMatchingReplacement(buffer, poem.replacements);
    if (match) {
        const newWord = getNextWord(match.match);
        
        if (newWord === match.match) {
            return;
        }

        wordPositions.push({
            start: match.start,
            length: match.match.length,
            replacement: newWord,
            id: Date.now()
        });

        const wordWidth = measureTextWidth(newWord);
        const originalWordWidth = measureTextWidth(match.match);
        const widthRatio = pageWidth / 2 / wordWidth;
        const heightRatio = canvas.height / 2 / fontSize;
        const targetScale = Math.min(1, Math.min(widthRatio, heightRatio));

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
    }
}

function handleKeyDown(event) {
    // Handle control keys
    if (event.key === "Backspace") {
        event.preventDefault();
        buffer = buffer.slice(0, -1);
        if (buffer[buffer.length - 1] === " ") {
            wordPositions.pop();
        }
        return;
    }

    if (event.key === "Enter") {
        event.preventDefault();
        endMode = true;
        return;
    }
    
    // Let the input event handle character input
    if (event.key.length === 1) {
        // Don't prevent default here - let the input event handle it
        return;
    }
    
    // Prevent default for navigation keys we want to capture
    if (
        event.key === "Tab" ||
        event.key === "Escape" ||
        event.key === "ArrowLeft" ||
        event.key === "ArrowRight" ||
        event.key === "ArrowUp" ||
        event.key === "ArrowDown"
    ) {
        event.preventDefault();
    }
}

function handleResize() {
    // Get current DPI scale
    const dpr = window.devicePixelRatio || 1;
    
    // Update canvas size with DPI awareness
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    
    // Scale canvas back with CSS
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    
    // Scale context
    ctx.scale(dpr, dpr);
    
    // Update other dimensions
    leftBoundary = window.innerWidth / 5;
    rightBoundary = window.innerWidth - leftBoundary;
    pageWidth = window.innerWidth - 2 * leftBoundary;
    
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    fontScreenRatio = window.innerHeight / fontSize;
}

function getNextWord(original) {
    console.log({original, 'new': poem.replacements[original]});
    if (poem.replacements[original] != null) {
        const options = poem.replacements[original];
        const next = options.shift();  // Take the first item
        options.push(next);           // Put it at the back
        return next;
    }
    return original;
}

function measureTextWidth(text) {
    if (!textWidthCache.has(text)) {
        textWidthCache.set(text, ctx.measureText(text).width);
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
        wordWidth = measureTextWidth(word);
        
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
        lastCharWidth = measureTextWidth(word[word.length - 1]);
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

function doReset() {
    buffer = "";
    time = 0;
    movingWords = [];
    wordPositions = []; // Reset word positions
    textWidthCache.clear(); // Clear cache on reset
    endMode = false;
}

function lerp(start, end, t) {
    return start * (1 - t) + end * t;
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
            ctx.save();
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
            ctx.translate(x, y);
            ctx.scale(s, s);
            ctx.fillStyle = "black";
            ctx.fillText(word.text, 0, 0);
            ctx.restore();
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
    ctx.fillStyle = "black";
    const words = buffer.split(" ");
    let [curX, curY] = [Math.round(leftBoundary), Math.round(leftBoundary)];
    let lastCharWidth;

    let wordWidth;
    for (let w = 0; w < words.length; w++) {
        const word = words[w];
        wordWidth = measureTextWidth(word);
        if (curX + wordWidth > rightBoundary) {
            curX = Math.round(leftBoundary);
            curY += Math.round(fontSize + lineSpacing);
        }

        for (const char of word) {
            lastCharWidth = measureTextWidth(char);
            ctx.save();
            ctx.translate(Math.round(curX), Math.round(curY));
            ctx.fillText(char, 0, 0);
            ctx.restore();
            curX += lastCharWidth;
        }
        curX += spaceWidth;
    }

    return calculateWordPosition(buffer);
}

function drawPastText(buffer, index, leftBoundary, rightBoundary, fontSize, lineSpacing) {
    ctx.fillStyle = `rgba(0, 0, 0, ${index * 0.1})`;
    const words = buffer.split(" ");
    let [curX, curY] = [Math.round(leftBoundary), Math.round(leftBoundary)];
    let lastCharWidth;

    let wordWidth;
    for (let w = 0; w < words.length; w++) {
        const word = words[w];
        wordWidth = measureTextWidth(word);
        if (curX + wordWidth > rightBoundary) {
            curX = Math.round(leftBoundary);
            curY += Math.round(fontSize + lineSpacing);
        }

        for (const char of word) {
            lastCharWidth = measureTextWidth(char);
            ctx.save();
            ctx.translate(Math.round(curX), Math.round(curY));
            ctx.fillText(char, 0, index * lineSpacing * 2 * 3);
            ctx.restore();
            curX += lastCharWidth;
        }
        curX += spaceWidth;
    }
}

function draw() {
    if (endMode && movingWords.length == 0) {
        doReset();
    }

    // Clear canvas
    ctx.fillStyle = "#c8c8c8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw background rectangle - use logical dimensions
    ctx.fillStyle = "white";
    ctx.fillRect(
        leftBoundary / 2,
        leftBoundary / 2,
        window.innerWidth - leftBoundary,
        window.innerHeight - leftBoundary
    );

    // Update time
    time += timeStep * (endMode ? endModeMod : 1);
    
    const t = time;

    // Draw animated words
    movingWords = drawLerpWords(movingWords, t, endMode);
    
    // Draw past buffers
    for(let b = 0; b < pastBuffers.length; b++) {
        let buff = pastBuffers[b].buffer;
        drawPastText(
            buff,
            pastBuffers.length - b,
            leftBoundary,
            rightBoundary,
            fontSize,
            lineSpacing
        );
    }
    
    // Draw current text
    lastWord = drawCurrentText(
        buffer,
        leftBoundary,
        rightBoundary,
        fontSize,
        lineSpacing
    );
    
    // Request next frame
    animationFrameId = requestAnimationFrame(draw);
}

function startAnimationLoop() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    animationFrameId = requestAnimationFrame(draw);
}

// Add this new function to handle high-DPI displays
function setupHiDPI() {
    // Get device pixel ratio
    const dpr = window.devicePixelRatio || 1;
    
    // Get CSS size
    const rect = canvas.getBoundingClientRect();
    
    // Set canvas attributes to match device pixels
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Scale canvas back down with CSS
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    // Scale the context to match
    ctx.scale(dpr, dpr);
}

// Initialize when the page loads
window.addEventListener('DOMContentLoaded', init);