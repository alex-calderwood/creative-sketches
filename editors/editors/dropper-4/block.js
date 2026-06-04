// Block schema
// {
//   text: string,
//   type: string, // linear, delete, constraint
//   [pos]: string // Noun, Verb, etc
//   [colorBy]: string,
// }

// colorBy can be 'pos', 'type', or 'random'

const colorMap = {
    'linear': { bg: '#ff0000', light: '#ff6666', dark: '#cc0000', darker: "#F0D3F7" },
    'random': { bg: '#ff8800', light: '#ffaa44', dark: '#cc6600', darker: '#E4572E' }, 

    'noun': { bg: '#0000ff', light: '#6666ff', dark: '#0000cc', darker: '#EE6A6D' },
    'adjective': { bg: '#00ff00', light: '#66ff66', dark: '#00cc00', darker: '#798478' },
    'verb': { bg: '#ffff00', light: '#ffff66', dark: '#cccc00', darker: '#9CF6F6' },
    'adverb': { bg: '#785212', light: '#9a6d2e', dark: '#5a421a', darker: '#E4572E' },

    'determiner': { bg: '#532699', light: '#6e34c3', dark: '#3c1a66', darker: '#67268E' },
    'preposition': { bg: '#ffff00', light: '#ffff66', dark: '#cccc00', darker: '#9CF600' }, 
    'interjection': { bg: '#ffff00', light: '#ffff66', dark: '#cccc00', darker: '#506A6D' }, 
    'conjunction': { bg: '#444444', light: '#666666', dark: '#222222', darker: '#9CF040' }, 
    'preposition': { bg: '#00ff00', light: '#66ff66', dark: '#00cc00', darker: '#798433' }, 
    'propernoun': { bg: '#111111', light: '#333333', dark: '#000000', darker: '#9CF111' },
    'value': { bg: '#111222', light: '#333444', dark: '#333333', darker: '#555044' },

    'delete': { bg: '#000000', light: '#000000', dark: '#000000', darker: '#000000' }  // Black for delete
}

function getColor(key) {
    key = key ? key.toLowerCase() : key;
    let color = colorMap[key] || colorMap['random'];
    return color;
}

function createBlockAt(block, left, top, width, height, colorBy = "pos") {
    let text = block.text;
    let wordType = block.type;

    if (!text || text === 'undefined') {
        console.warn('createBlockAt called with invalid text:', block);
        return null;
    }

    console.log('createBlockAt', block);

    const newElement = document.createElement('div');
    newElement.classList.add('move');
    newElement.classList.add('block');

    if (wordType != "word") {
        newElement.classList.add(wordType);
    }

    let colorKey;
    if (wordType === "constraint" && block.constraint) {
        let constraintType = block.constraint.type;
        let constraintValue = block.constraint.value;
        newElement.setAttribute('data-constraint', constraintValue);
        colorKey = constraintValue;
    } else {
        let blockType = block.type;
        colorKey = block[colorBy] ||  blockType;
        newElement.setAttribute('data-constraint', block?.pos || 'none');
    }

    newElement.style.left = `${left}px`;
    newElement.style.top = `${top}px`;
    newElement.style.height = `${height}px`;
    newElement.style.width = `${width}px`;
    newElement.style.fontSize = `${height}px`;

    document.body.appendChild(newElement);

    const blockWordElement =  document.createElement('div');
    blockWordElement.classList.add('block-word');
    blockWordElement.style.fontSize = `10px`;

    blockWordElement.textContent = text;
    newElement.appendChild(blockWordElement);

    requestAnimationFrame(() => { // make sure it has rendered before measuring
        setTimeout(() => {
        let rect = blockWordElement.getBoundingClientRect();
        let scale = width / rect.width;
        let scaleY = height / rect.height;
        
        blockWordElement.style.transform = `scaleX(${scale}) scaleY(${scaleY})`;
        }, 1); // Just 1ms delay helps the calculation be correct
    });

    // Set the colors
    let color = getColor(colorKey);
    newElement.style.setProperty('--data-color', color.darker); // for pseudo-element styling

    return newElement;
}