// Block schema
// {
//   text: string,
//   type: string, // linear, delete, constraint
//   [pos]: string // Noun, Verb, etc
//   [colorBy]: string,
// }

// colorBy can be 'pos', 'type', 'random', or 'display.color'

const DELETE_SCALE_MOD = {x: 0.1, y: 0.1};
const I_SCALE_MOD = {x: 0.7, y: 1};

const PARENT = document.querySelector("#game");

/**
 * Convert a MIDI note (0-127) to an HSV hue value (0-360)
 * @param {number} note - MIDI note number (0-127)
 * @returns {number} Hue value (0-360 degrees)
 */
export function noteToHue(note) {
    // Map 0-127 to 0-360 degrees
    return (note / 127) * 360;
}

/**
 * Convert HSV to RGB
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-1)
 * @param {number} v - Value (0-1)
 * @returns {Object} RGB object with r, g, b values (0-255)
 */
function hsvToRgb(h, s, v) {
    let c = v * s;
    let x = c * (1 - Math.abs((h / 60) % 2 - 1));
    let m = v - c;
    
    let r, g, b;
    if (h < 60) {
        [r, g, b] = [c, x, 0];
    } else if (h < 120) {
        [r, g, b] = [x, c, 0];
    } else if (h < 180) {
        [r, g, b] = [0, c, x];
    } else if (h < 240) {
        [r, g, b] = [0, x, c];
    } else if (h < 300) {
        [r, g, b] = [x, 0, c];
    } else {
        [r, g, b] = [c, 0, x];
    }
    
    return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255)
    };
}

/**
 * Convert hue to RGB color string
 * @param {number} hue - Hue value (0-360)
 * @returns {string} RGB color string
 */
function hueToColor(hue) {
    // For vivid pastels: lower saturation (0.5) + high value/brightness (1.0)
    const rgb = hsvToRgb(hue, 0.5, 1.0);
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
}

/**
 * Update a block's text color based on a hue value
 * @param {HTMLElement} blockElement - The block DOM element
 * @param {number} hue - Hue value (0-360)
 */
export function updateBlockColor(blockElement, hue) {
    const color = hueToColor(hue);
    const blockWord = blockElement.querySelector('.block-word');
    if (blockWord) {
        blockWord.style.color = color;
    }
}

export function getScaleModifier(element) {
    // For new blocks, element is the text string
    // For existing blocks, element is the DOM element
    if (typeof element === 'string') {
        if (element.toLowerCase() === 'i') {
            return I_SCALE_MOD;
        }
        return {x: 1, y: 1};
    }
    
    // Handle DOM element case
    if (element.classList.contains('delete')) {
        return DELETE_SCALE_MOD;
    }
    
    const blockWord = element.querySelector('.block-word');
    if (blockWord && blockWord.textContent.toLowerCase() === 'i') {
        return I_SCALE_MOD;
    }
    
    return {x: 1, y: 1};
}

function getColorFromCSS(key) {
    const root = document.documentElement;
    const style = getComputedStyle(root);
    
    return {
        bg: style.getPropertyValue(`--color-${key}-bg`).trim(),
        light: style.getPropertyValue(`--color-${key}-light`).trim(),
        dark: style.getPropertyValue(`--color-${key}-dark`).trim(),
        darker: style.getPropertyValue(`--color-${key}-darker`).trim()
    };
}

export function getColor(key) {
    key = key ? key.toLowerCase() : key;
    
    let color = getColorFromCSS(key);

    // if the key doesn't exist, we want to hashmap the key onto the existing css values
    if (!color.bg) {
        let hashKey = getColorKeyFromHash(key);
        color = getColorFromCSS(hashKey);
    }

    return color;
}

let colorKeys = [];
function getColorKeyFromHash(key) {
    if (!colorKeys.length) {
        // read the css to get all the color keys
        const root = document.documentElement;
        const style = getComputedStyle(root);
        colorKeys = Array.from(Object.keys(style))
            .map(i => style[i])
            .filter(name => typeof name === 'string' && name.endsWith('-darker'));
        colorKeys = colorKeys.map(key => key.replace('-darker', '').replace('--color-', ''));
    }

    // hash the values to produce a deterministic color given the key string
    let hash = getHash(key);
    return colorKeys[Math.abs(hash) % colorKeys.length];
}

// a standard JS hash function to create a deterministic number from the key.
// This is DJB2: fast, robust, and widely used for string hashing.
function getHash(key) {
    let hash = 5381;
    for (let i = 0; i < key.length; i++) {
        hash = ((hash << 5) + hash) + key.charCodeAt(i); // hash * 33 + char
    }
    return hash;
}

export function setColor(blockElt, color) {
    blockElt.style.setProperty('--data-color', color); // for pseudo-element styling
}

export function createBlockAt(token, left, top, width, height, colorBy = "pos") {
    let text = token.text;
    let wordType = token.type;

    if (!text || text === 'undefined') {
        console.warn('createBlockAt called with invalid text:', token);
        return null;
    }

    const blockElt = document.createElement('div');
    blockElt.classList.add('move');
    blockElt.classList.add('block');

    if (wordType != "word") {
        blockElt.classList.add(wordType);
    }

    let colorKey;
    if (wordType === "constraint" && token.constraint) {
        let constraintType = token.constraint.type;
        let constraintValue = token.constraint.value;
        blockElt.setAttribute('data-constraint', constraintValue);
        colorKey = constraintValue;
    } else {
        let blockType = token.type;
        blockElt.setAttribute('data-constraint', token?.pos || 'none');

        colorKey = token[colorBy] || blockType;
        if (colorBy === 'source') {
            colorKey = token.source;
        }
    }

    blockElt.style.left = `${left}px`;
    blockElt.style.top = `${top}px`;
    blockElt.style.height = `${height}px`;
    blockElt.style.width = `${width}px`;
    blockElt.style.fontSize = `${height}px`;

    PARENT.appendChild(blockElt);

    const blockWordElement =  document.createElement('div');
    blockWordElement.classList.add('block-word');

    // Set the text
    blockWordElement.textContent = text;
    blockElt.appendChild(blockWordElement);

    blockWordElement.style.fontSize = `10px`;

    let additionalScaleMod = getScaleModifier(text);

    requestAnimationFrame(() => { // make sure it has rendered before measuring
        setTimeout(() => {
        let rect = blockWordElement.getBoundingClientRect();
        let scaleX = width / rect.width;
        let scaleY = height / rect.height;

        scaleX *= additionalScaleMod.x;
        scaleY *= additionalScaleMod.y;
        
        blockWordElement.style.transform = `scaleX(${scaleX}) scaleY(${scaleY})`;
        }, 1); // Just 1ms delay helps the calculation be correct
    });

    // Set the colors
    let color = getColor(colorKey);
    setColor(blockElt, color.darker);

    return blockElt;
}

export function getBlockText(block) {
    let blockWord = block.querySelector('.block-word');
    if (!blockWord) {
        return '';
    }
    return blockWord.textContent;
}

export function rotateTo(element, centerX, centerY, angle, speed=100) {
    if (!element) {
        console.error("rotateTo() called with null element");
        return;
    }
    
    // Get element's position from its style properties (not including transforms)
    const elementLeft = parseFloat(element.style.left) || 0;
    const elementTop = parseFloat(element.style.top) || 0;
    
    // Calculate transform-origin relative to element's position
    const originX = centerX - elementLeft;
    const originY = centerY - elementTop;
    
    element.style.transformOrigin = `${originX}px ${originY}px`;
    
    // Set up animation timing
    const timing = {
        duration: speed,
        iterations: 1,
        fill: "forwards",
        easing: "linear"
    };
    
    // Animate the rotation
    const animationFrames = [
        { transform: `rotate(${angle}rad)` }
    ];
    
    element.animate(animationFrames, timing);
}

/**
 * Rotates an element around its own center
 * @param {HTMLElement} element - The element to rotate
 * @param {number} angle - The angle in radians
 * @param {number} speed - Animation duration in milliseconds
 */
export function rotate(element, angle, speed=100) {
    if (!element) {
        console.error("rotate() called with null element");
        return;
    }
    
    // Set transform origin to center of element (default)
    element.style.transformOrigin = 'center center';
    
    // Set up animation timing
    const timing = {
        duration: speed,
        iterations: 1,
        fill: "forwards",
        easing: "linear"
    };
    
    // Animate the rotation
    const animationFrames = [
        { transform: `rotate(${angle}rad)` }
    ];
    
    element.animate(animationFrames, timing);
}


// move an element to the coordinates using the absolute left and top values
// does not use the transform property, so it can be used for elements that are not scaled
export function moveTo(element, leftPx, topPx, speed=500, resetTransform=false, easing='ease-out') {
    const timing = {
      duration: speed,
      iterations: 1,
      fill: "forwards", // stay put 
      easing: easing
    };
    const animationFrames = [
      { 
        left: `${leftPx}px`, 
        top: `${topPx}px`
      }
    ];
  
    if (resetTransform) {
      animationFrames[0].transform = `translateX(0px) translateY(0px) scaleX(1) scaleY(1)`;
    }
  
    element.style.position = "absolute";
  
    // https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Using_the_Web_Animations_API
    element.animate(animationFrames, timing);
  }
  
  function moveToScaled(element, leftPx, topPx, scaleX, scaleY, speed=500) {
    const timing = {
      duration: speed,
      iterations: 1,
      fill: "forwards" // stay put
    };
  
    const animationFrames = [
      { transform: `translateX(${leftPx}px) translateY(${topPx}px) scaleX(${scaleX}) scaleY(${scaleY})` },
    ];
  
    element.animate(animationFrames, timing);
  }
  
  // move an element to the coordinates using the transform property
  // the 'transform property' is used in JS to 
  function animateToRelative(word, dX, dY, scale, speed=500) {
    const { text, rect, node, startIndex, endIndex, element: editor } = word;
     
    const timing = {
      duration: speed,
      iterations: 1,
      fill: "forwards" 
    };
  
    const animationFrames = [
      { color: "red" },
      { transform: `translateX(${dX}px) translateY(${dY}px) scale(${scale})` },
    ];
    
    const newElement = document.createElement('div');
    newElement.classList.add('move');
    newElement.textContent = text;
    const { left, top, width, height } = rect;
  
    newElement.style.left = `${left}px`;
    newElement.style.top = `${top}px`;
    newElement.style.width = `${width}px`;
    newElement.style.height = `${height}px`;
  
    PARENT.appendChild(newElement); 
  
    word.ghost = newElement;
  
    // https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Using_the_Web_Animations_API
    newElement.animate(animationFrames, timing);
  }
  