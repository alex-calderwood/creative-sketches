// Block schema
// {
//   text: string,
//   type: string, // linear, delete, constraint
//   [pos]: string // Noun, Verb, etc
//   [colorBy]: string,
// }

// colorBy can be 'pos', 'type', or 'random'

const DELETE_SCALE_MOD = {x: 0.1, y: 0.1};
const I_SCALE_MOD = {x: 0.7, y: 1};

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

const colorMap = {
    'linear': { bg: '#ff0000', light: '#ff6666', dark: '#cc0000', darker: "#8e40d6" },
    'random': { bg: '#ff8800', light: '#ffaa44', dark: '#cc6600', darker: '#E4572E' }, 

    'noun': { bg: '#0000ff', light: '#6666ff', dark: '#0000cc', darker: '#EE6A6D' },
    'adjective': { bg: '#00ff00', light: '#66ff66', dark: '#00cc00', darker: '#798478' },
    'verb': { bg: '#ffff00', light: '#ffff66', dark: '#cccc00', darker: '#14d2d2' },
    'adverb': { bg: '#785212', light: '#9a6d2e', dark: '#5a421a', darker: '#FF572E' },

    'determiner': { bg: '#532699', light: '#6e34c3', dark: '#3c1a66', darker: '#67268E' },
    'preposition': { bg: '#ffff00', light: '#ffff66', dark: '#cccc00', darker: '#9CF600' }, 
    'interjection': { bg: '#ffff00', light: '#ffff66', dark: '#cccc00', darker: '#506A6D' }, 
    'conjunction': { bg: '#444444', light: '#666666', dark: '#222222', darker: '#9CF040' }, 
    'preposition': { bg: '#00ff00', light: '#66ff66', dark: '#00cc00', darker: '#798433' }, 
    'propernoun': { bg: '#111111', light: '#333333', dark: '#000000', darker: '#8bd90d' },
    'value': { bg: '#111222', light: '#333444', dark: '#333333', darker: '#555044' },

    'delete': { bg: '#000000', light: '#000000', dark: '#000000', darker: '#a8280e' },  // Black for delete
    'word': { bg: '#000000', light: '#000000', dark: '#000000', darker: '#779977' }
}

export function getColor(key) {
    key = key ? key.toLowerCase() : key;
    let color = colorMap[key] || colorMap['random'];
    return color;
}

export function createBlockAt(token, left, top, width, height, colorBy = "pos") {
    let text = token.text;
    let wordType = token.type;

    if (!text || text === 'undefined') {
        console.warn('createBlockAt called with invalid text:', token);
        return null;
    }

    const newElement = document.createElement('div');
    newElement.classList.add('move');
    newElement.classList.add('block');

    if (wordType != "word") {
        newElement.classList.add(wordType);
    }

    let colorKey;
    if (wordType === "constraint" && token.constraint) {
        let constraintType = token.constraint.type;
        let constraintValue = token.constraint.value;
        newElement.setAttribute('data-constraint', constraintValue);
        colorKey = constraintValue;
    } else {
        let blockType = token.type;
        colorKey = token[colorBy] ||  blockType;
        newElement.setAttribute('data-constraint', token?.pos || 'none');
    }

    newElement.style.left = `${left}px`;
    newElement.style.top = `${top}px`;
    newElement.style.height = `${height}px`;
    newElement.style.width = `${width}px`;
    newElement.style.fontSize = `${height}px`;

    document.body.appendChild(newElement);

    const blockWordElement =  document.createElement('div');
    blockWordElement.classList.add('block-word');

    // Set the text
    blockWordElement.textContent = text;
    newElement.appendChild(blockWordElement);

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
    newElement.style.setProperty('--data-color', color.darker); // for pseudo-element styling

    return newElement;
}

export function getBlockText(block) {
    let blockWord = block.querySelector('.block-word');
    if (!blockWord) {
        return '';
    }
    return blockWord.textContent;
}