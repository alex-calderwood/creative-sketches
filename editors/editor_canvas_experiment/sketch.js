const config = {
  fontSize: 20,
  lineSpacing: 10,
  timeBetween: 0.35,
  timeStep: 0.1,
  cursorBlinkRate: 530, // ms
  spaceWidth: null, // Will be calculated after font loads
  maxHistory: 100, 
  textColor: "black",
};

// Replace individual variables with config object references
let n = 1;
let offset, fontScreenRatio;
let charWidth, charHeight;
let buffer = "";
let font = `${config.fontSize}px monospace`; // Default font until loaded
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
let wordPositions = []; 

let time = 0;
const timeStep = config.timeStep;
let frames = 0;
let endMode = false;
const timeBetween = config.timeBetween; 

const textWidthCache = new Map();

// Canvas and context
let canvas, ctx;
let animationFrameId;
let fontLoaded = false;
let hiddenInput; // Hidden input element for focus and clipboard operations

let width, height; 

let cursorVisible = true;
let lastCursorBlink = 0;

const cursor = {
  start: 0,
  end: 0
};

let isDragging = false;
let mouseDownPosition = null;

const undoStack = [];
const redoStack = [];

// Add this to your global variables
let charPositions = [];

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
                font = `${config.fontSize}px ${fontName}`;
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

// Initialize - equivalent to preload() and setup()
async function init() {
    // Setup canvas
    canvas = document.getElementById('canvas') || document.querySelector('canvas');
    if (!canvas) {
        canvas = document.createElement('canvas');
        document.body.appendChild(canvas);
    }
    
    ctx = canvas.getContext('2d');
    
    // Account for device pixel ratio for crisp text
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    // Set canvas size accounting for device pixel ratio
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Scale canvas back down with CSS
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    // Scale the context to account for the device pixel ratio
    ctx.scale(dpr, dpr);
    
    // Set text rendering options for crisp text
    ctx.textRendering = 'geometricPrecision';
    ctx.imageSmoothingEnabled = false;
    
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
    
    await loadFont("fonts/VictorMono-Regular.ttf");
    
    width = rect.width;
    height = rect.height;
    
    leftBoundary = width / 5;
    rightBoundary = width - leftBoundary;
    pageWidth = width - 2 * leftBoundary;

    offset = config.fontSize / n;
    fontScreenRatio = canvas.height / config.fontSize;

    ctx.font = font;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";

    startTime = performance.now();
    spaceWidth = measureTextWidth(" ");
    
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
    
    config.spaceWidth = measureTextWidth(" ");
    spaceWidth = config.spaceWidth;
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
    
    // Mouse events for text selection
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    
    document.addEventListener('keydown', handleClipboardOperations);
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

function updateBuffer(start, end, text = "") {
    // Save current state for undo
    saveHistoryState();
    
    // Replace text between start and end with the new text
    buffer = buffer.substring(0, start) + text + buffer.substring(end);
    
    // Move cursor to after the inserted text
    cursor.start = cursor.end = start + text.length;
    
    return buffer;
}

function processTextInput(text) {
    if (!text || text.length === 0) return;
    
    const char = text.charAt(0);
    
    // Check if there's a selection active
    if (cursor.start !== cursor.end) {
        const start = Math.min(cursor.start, cursor.end);
        const end = Math.max(cursor.start, cursor.end);
        
        // Use updateBuffer to replace selected text with new character
        updateBuffer(start, end, char);
    } else {
        // Insert character at cursor position
        const pos = cursor.start;
        updateBuffer(pos, pos, char);
    }
    
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
        const heightRatio = canvas.height / 2 / config.fontSize;
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
        
        // Check if there's a selection active
        if (cursor.start !== cursor.end) {
            const start = Math.min(cursor.start, cursor.end);
            const end = Math.max(cursor.start, cursor.end);
            
            // Delete selected text
            updateBuffer(start, end, "");
        } else if (cursor.start > 0) {
            // Normal backspace behavior - delete one character before cursor
            updateBuffer(cursor.start - 1, cursor.start, "");
            
            if (buffer[cursor.start - 1] === " ") {
                wordPositions.pop();
            }
        }
        return;
    }

    if (event.key === "Enter") {
        event.preventDefault();
        // Insert a newline character instead of triggering endMode
        const pos = cursor.start;
        updateBuffer(pos, pos, "\n");
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
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    width = rect.width;
    height = rect.height;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    // Scale canvas back down with CSS
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    // Reset the context scale
    ctx.scale(dpr, dpr);
    
    ctx.textRendering = 'geometricPrecision';
    ctx.imageSmoothingEnabled = false;

    leftBoundary = width / 5;
    rightBoundary = width - leftBoundary;
    pageWidth = width - 2 * leftBoundary;
    
    ctx.font = font;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    fontScreenRatio = rect.height / config.fontSize;
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
            curY += config.fontSize + config.lineSpacing;
        }

        // If this is the word we're looking for, return its position
        if (word === upToWord) {
            return {
                x: curX, 
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
        x: curX - spaceWidth,  // Position after last word without trailing space
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
}

function lerp(start, end, t) {
    return start * (1 - t) + end * t;
}

function drawLerpWords(movingWords, t) {
    let filteredWords = [];

    movingWords.forEach((word) => {
        const progress = Math.min(1, Math.max(0, t - word.startTime));
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
            
            filteredWords.push(word);
        } else {
            filteredWords.push(word);
        }
    });
    
    return filteredWords;
}

function drawText(text, x, y, options = {}) {
    const {
        color = config.textColor,
        highlight = null,
        fontSize = config.fontSize
    } = options;
    
    // Save current context state
    ctx.save();
    
    // Set text properties
    ctx.fillStyle = color;
    
    // Calculate text width for positioning
    const textWidth = measureTextWidth(text);
    
    // Draw highlight if specified
    if (highlight) {
        ctx.fillStyle = highlight;
        ctx.fillRect(x, y - fontSize/2, textWidth, fontSize);
        ctx.fillStyle = color; // Reset to text color
    }
    
    // Draw the text (no need to change alignment since we're using left globally)
    ctx.fillText(text, x, y);
    
    ctx.restore();
    
    return textWidth;
}

function drawCurrentText(buffer, leftBoundary, rightBoundary, fontSize, lineSpacing) {
    // Reset the character positions cache
    charPositions = [];
    
    // Split the buffer by newlines first, then process each line
    const lines = buffer.split("\n");
    let [curX, curY] = [leftBoundary, leftBoundary];
    let charIndex = 0;
    let cursorPosition = null;

    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const words = line.split(" ");
        
        // Reset X position for each line
        curX = leftBoundary;
        
        // Process each word in the line
        for (let w = 0; w < words.length; w++) {
            const word = words[w];
            if (word.length === 0 && w === 0) {
                // Empty word at start of line (after newline)
                if (charIndex === cursor.start && cursor.start === cursor.end) {
                    cursorPosition = { x: curX, y: curY };
                }
                // Cache this position
                charPositions[charIndex] = { x: curX, y: curY, width: 0 };
                charIndex++;
                continue;
            }
            
            const wordWidth = measureTextWidth(word);
            
            if (curX + wordWidth > rightBoundary) {
                curX = leftBoundary;
                curY += fontSize + lineSpacing;
            }

            for (const char of word) {
                // Track cursor position if this is where it should be
                if (charIndex === cursor.start && cursor.start === cursor.end) {
                    cursorPosition = { x: curX, y: curY };
                }
                
                // Check if this character is within selection
                const isSelected = (charIndex >= Math.min(cursor.start, cursor.end) && 
                                   charIndex < Math.max(cursor.start, cursor.end));
                
                // Draw the character with optional highlighting
                const charWidth = drawText(char, curX, curY, {
                    highlight: isSelected ? "#b3d9ff" : null,
                    fontSize: fontSize
                });
                
                // Cache this character's position and width
                charPositions[charIndex] = { x: curX, y: curY, width: charWidth };
                
                curX += charWidth;
                charIndex++;
            }
            
            // Handle space after word (except for last word)
            if (w < words.length - 1) {
                // Track cursor position if this is where it should be
                if (charIndex === cursor.start && cursor.start === cursor.end) {
                    cursorPosition = { x: curX, y: curY };
                }
                
                // Check if space is selected
                const isSelected = (charIndex >= Math.min(cursor.start, cursor.end) && 
                                   charIndex < Math.max(cursor.start, cursor.end));
                
                // Draw space with optional highlighting
                drawText(" ", curX, curY, {
                    highlight: isSelected ? "#b3d9ff" : null,
                    fontSize: fontSize
                });
                
                // Cache space position
                charPositions[charIndex] = { x: curX, y: curY, width: spaceWidth };
                
                curX += spaceWidth;
                charIndex++;
            }
        }
        
        // Handle newline character (except for the last line)
        if (lineIndex < lines.length - 1) {
            // Track cursor position if this is where it should be
            if (charIndex === cursor.start && cursor.start === cursor.end) {
                cursorPosition = { x: curX, y: curY };
            }
            
            // Cache newline position
            charPositions[charIndex] = { x: curX, y: curY, width: 0 };
            
            // Move to next line
            curY += fontSize + lineSpacing;
            curX = leftBoundary;
            charIndex++;
        }
    }

    // Add a position for the end of text (for cursor placement)
    charPositions[charIndex] = { x: curX, y: curY, width: 0 };
    
    // Check if cursor should be at the end of text
    if (cursor.start === cursor.end && cursor.start === buffer.length) {
        cursorPosition = { x: curX, y: curY };
    }
    
    // Return both the word position and cursor position
    return {
        wordPos: calculateWordPosition(buffer),
        cursorPos: cursorPosition
    };
}

function drawCursor(cursorPos, fontSize) {
    if (!cursorPos) return;
    
    const now = performance.now();
    if (now - lastCursorBlink > config.cursorBlinkRate) {
        cursorVisible = !cursorVisible;
        lastCursorBlink = now;
    }
    
    if (cursorVisible) {
        ctx.fillStyle = "black";
        ctx.fillRect(cursorPos.x, cursorPos.y - fontSize/2, 2, fontSize);
    }
}

function draw() {
    // Clear canvas
    ctx.fillStyle = "#c8c8c8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw background rectangle using dimensions
    ctx.fillStyle = "white";
    ctx.fillRect(
        leftBoundary / 2,
        leftBoundary / 2,
        width - leftBoundary,
        height
    );

    time += config.timeStep;
    
    const t = time;

    movingWords = drawLerpWords(movingWords, t);
    
    // Draw current text and get positions
    const positions = drawCurrentText(
        buffer,
        leftBoundary,
        rightBoundary,
        config.fontSize,
        config.lineSpacing
    );
    
    lastWord = positions.wordPos;
    
    if (cursor.start === cursor.end) {
        drawCursor(positions.cursorPos, config.fontSize);
    }
    
    // Request next frame
    animationFrameId = requestAnimationFrame(draw);
}

function startAnimationLoop() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    animationFrameId = requestAnimationFrame(draw);
}

// Initialize when the page loads
window.addEventListener('DOMContentLoaded', init);

function handleMouseDown(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    mouseDownPosition = { x, y };
    isDragging = true;
    
    // places the cursor at the clicked position
    const clickPosition = getCharIndexAtPosition(x, y);
    cursor.start = clickPosition;
    cursor.end = clickPosition;
    console.log('mouse down', {x, y, clickPosition, start: cursor.start, end: cursor.end});
    
    // Focus the hidden input to ensure keyboard events work
    hiddenInput.focus();
}

function handleMouseMove(event) {
    if (!isDragging) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    cursor.end = getCharIndexAtPosition(x, y);
}

function handleMouseUp(event) {
    // If we didn't move much, treat it as a click (cursor placement)
    // rather than a selection drag
    if (isDragging) {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // If this was just a click (minimal movement), keep cursor at click position
        if (mouseDownPosition && 
            Math.abs(x - mouseDownPosition.x) < 5 && 
            Math.abs(y - mouseDownPosition.y) < 5) {
            // Keep start and end the same (cursor placement)
            cursor.end = cursor.start;
        } else {
            // This was a drag, so update the selection end
            cursor.end = getCharIndexAtPosition(x, y);
        }
    }
    
    isDragging = false;
}

function getCharIndexAtPosition(x, y) {
    if (charPositions.length === 0) return 0;
    
    // Find the closest character to the clicked position
    let closestIndex = 0;
    let closestDistance = Infinity;
    
    for (let i = 0; i < charPositions.length; i++) {
        const pos = charPositions[i];
        
        // Check if we're on the right line first (vertical proximity is most important)
        const verticalDistance = Math.abs(y - pos.y);
        if (verticalDistance > config.fontSize) continue;
        
        // For characters on the right line, check both the start and end positions
        
        // Distance to the start of the character (left edge)
        const distToStart = Math.abs(x - pos.x);
        if (verticalDistance < config.fontSize/2 && distToStart < closestDistance) {
            closestDistance = distToStart;
            closestIndex = i; // Position BEFORE this character
        }
        
        // Distance to the end of the character (right edge)
        const distToEnd = Math.abs(x - (pos.x + pos.width));
        if (verticalDistance < config.fontSize/2 && distToEnd < closestDistance) {
            closestDistance = distToEnd;
            closestIndex = i + 1; // Position AFTER this character
        }
    }
    
    // Make sure we don't exceed the buffer length
    return Math.min(closestIndex, charPositions.length - 1);
}

function handleClipboardOperations(event) {
    // Select All (Ctrl+A or Command+A)
    if ((event.ctrlKey || event.metaKey) && event.key === 'a') {
        console.log('select all triggered');
        event.preventDefault();
        cursor.start = 0;
        cursor.end = buffer.length;
        return;
    }
    
    // Undo (Ctrl+Z or Command+Z)
    if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        console.log('undo triggered from clipboard handler');
        event.preventDefault();
        performUndo();
        return;
    }
    
    // Redo (Ctrl+Y or Command+Shift+Z)
    if ((event.ctrlKey || event.metaKey) && 
        ((event.key === 'y') || (event.key === 'z' && event.shiftKey))) {
        console.log('redo triggered from clipboard handler');
        event.preventDefault();
        performRedo();
        return;
    }
    
    // Copy (Ctrl+C or Command+C)
    if ((event.ctrlKey || event.metaKey) && event.key === 'c' && cursor.start !== cursor.end) {
        event.preventDefault();
        const start = Math.min(cursor.start, cursor.end);
        const end = Math.max(cursor.start, cursor.end);
        const selectedText = buffer.substring(start, end);
        navigator.clipboard.writeText(selectedText);
    }
    
    // Cut (Ctrl+X or Command+X)
    if ((event.ctrlKey || event.metaKey) && event.key === 'x' && cursor.start !== cursor.end) {
        event.preventDefault();
        const start = Math.min(cursor.start, cursor.end);
        const end = Math.max(cursor.start, cursor.end);
        const selectedText = buffer.substring(start, end);
        navigator.clipboard.writeText(selectedText);
        
        // Use updateBuffer to delete selected text
        updateBuffer(start, end, "");
    }
    
    // Paste (Ctrl+V or Command+V)
    if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        event.preventDefault();
        navigator.clipboard.readText().then(text => {
            // Insert text at cursor or replace selection
            const start = Math.min(cursor.start, cursor.end);
            const end = Math.max(cursor.start, cursor.end);
            
            // Use updateBuffer to insert pasted text
            updateBuffer(start, end, text);
        });
    }
}

// Move undo/redo logic to dedicated functions
function performUndo() {
    if (undoStack.length > 0) {
        redoStack.push(buffer);
        buffer = undoStack.pop();
        
        cursor.start = cursor.end = buffer.length;
        return true;
    }
    return false;
}

function performRedo() {
    if (redoStack.length > 0) {
        undoStack.push(buffer);
        buffer = redoStack.pop();
        
        cursor.start = cursor.end = buffer.length;
        return true;
    }
    return false;
}

function saveHistoryState() {
    undoStack.push(buffer);
    if (undoStack.length > config.maxHistory) {
        undoStack.shift(); // Remove oldest state
    }
    redoStack.length = 0; // Clear redo stack
}
