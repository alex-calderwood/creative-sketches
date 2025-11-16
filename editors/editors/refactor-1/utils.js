const mistakesElement = document.getElementById('mistakes');
const wordCount = document.getElementById('word-count');

// TODO DO JUST SHOW A LIST OF THE MISTAKES

// Rain functionality from concrete-6
const assetsFolder = '/editors/assets/rain';
const audioSamples = [];
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

const enlargedWords = [];
var SCALE = 10;

// Function to load an audio file
async function loadAudioFile(filename) {
  try {
    const response = await fetch(`${assetsFolder}/${filename}`);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    audioSamples.push(audioBuffer);
  } catch (error) {
    console.error('Error loading audio file:', filename, error);
  }
}

// Load all audio files
async function loadAllAudioFiles() {
  // Try to load files with common names
  const files = Array.from({length: 16}, (_, i) => `rain${i + 1}.wav`);
  await Promise.all(files.map(file => loadAudioFile(file)));
}

// Load all audio files
loadAllAudioFiles();

export function getTextWidth(element, startIndex=0, endIndex=null) {
  if (endIndex === null) {
    endIndex = element.textContent.length;
  }

  const text = element.textContent.slice(startIndex, endIndex);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  // Get the computed style of the element
  const style = window.getComputedStyle(element);
  context.font = `${style.fontSize} ${style.fontFamily}`;
  context.textBaseline = 'top';

  
  return context.measureText(text).width;
}

export function enlargeWord(word) {
  const { rect, element: editor } = word;
  let editorBounds = editor.getBoundingClientRect();
  const { left, top, width, height } = rect;
  let dY = (editorBounds.height - top) / 2;
  let dX = - left - width/2 + editorBounds.left + editorBounds.width/2;


  let editorWidth = editorBounds.width;
  let editorHeight = editorBounds.height * 0.8;
  // let textWidth = getTextWidth(word.element, word.startIndex, word.endIndex);

  // scale to the width of the editor
  let scaleX = editorWidth / width;
  let scaleY = editorHeight / height;
  let scale = Math.min(scaleX, scaleY);

  let newWordElement = animateToRelative(word, dX, dY, scale, 200);

  enlargedWords.push(word);
  return newWordElement;
}

/**
 * Move an element to the coordinates using absolute left and top values.
 * Does not use the transform property, so it can be used for elements that are not scaled.
 * 
 * IMPORTANT: This function uses the Web Animations API (element.animate()) to create a smooth
 * animation. The animation visually moves the element, BUT it also updates the actual 
 * style.left and style.top properties to the target values so that other code can read
 * the current position. Without updating the actual style properties, code that reads
 * element.style.left would get the original starting position, not the animated target.
 * 
 * @param {HTMLElement} element - The element to move
 * @param {number} leftPx - Target left position in pixels
 * @param {number} topPx - Target top position in pixels
 * @param {number} speed - Animation duration in milliseconds (default: 500)
 * @param {boolean} resetTransform - Whether to reset transforms (default: false)
 * @param {string} easing - Animation easing function (default: 'ease-out')
 */
export function moveTo(element, leftPx, topPx, speed=500, resetTransform=false, easing='ease-out') {
  if (element == null) {
    console.error("Cannot move null element", element);
    return;
  }

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
  
  // Update the actual style properties to match the target position
  // This ensures that code reading element.style.left/top gets the target position,
  // not the original position before animation
  element.style.left = `${leftPx}px`;
  element.style.top = `${topPx}px`;
}

export function moveToScaled(element, leftPx, topPx, scaleX, scaleY, speed=500) {
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
export function animateToRelative(word, dX, dY, scale, speed=500) {
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

  document.body.appendChild(newElement); 

  word.ghost = newElement;

  // https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Using_the_Web_Animations_API
  newElement.animate(animationFrames, timing);
}


/* Play the word raining animation */
export function makeFall(word) {
  const { text, rect, node, startIndex, endIndex, element: editor } = word;
  for (let i = 0; i < text.length; i++) {
    const fallDelay = i * 50; // 50ms delay between each letter's fall start
    letterFall(text, i, startIndex, endIndex, rect, editor, fallDelay);
  }

  return text.length;
}


export function letterFall(text, i, startIndex, endIndex, rect, editor, fallDelay = 0) {
  const letter = text[i];

  const newElement = document.createElement('div');
  newElement.className = 'rain';
  newElement.textContent = letter;

  const { left, top, width, height } = rect;

  // Create a temporary element with the word's text to measure character positions
  const tempElement = document.createElement('span');
  tempElement.style.font = window.getComputedStyle(editor).font;
  tempElement.textContent = text.slice(0, i);
  document.body.appendChild(tempElement);
  const letterOffset = tempElement.getBoundingClientRect().width;
  document.body.removeChild(tempElement);

  newElement.style.left = `${left + letterOffset}px`;
  newElement.style.top = `${top}px`;
  newElement.style.width = `${width}px`;
  newElement.style.height = `${height}px`;

  const distanceToBottom = editor.getBoundingClientRect().height - top;
  const speed = 500 * 500; // pixels per second
  const duration = distanceToBottom * distanceToBottom / speed; // should be calculated by square of dist?
  newElement.style.setProperty('--distance', `${distanceToBottom}px`);
  newElement.style.setProperty('--duration', `${duration}s`);
  newElement.style.animationDelay = `${fallDelay}ms`;

  document.body.appendChild(newElement);

  // Play sound after duration
  const cssChange = 0.97;

  if (duration > 0) {
    setTimeout(() => {
      if (audioSamples.length > 0) {
        const source = audioContext.createBufferSource();
        const randomIndex = Math.floor(Math.random() * audioSamples.length);
        source.buffer = audioSamples[randomIndex];
        source.connect(audioContext.destination);
        source.start();
      }
    }, duration * 1000 * cssChange);
  }
}

/* 
Function called in spellcheck.js when misspellingsChanged event is fired


// https://stackoverflow.com/questions/44846614/trigger-css-animations-in-javascript
// https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API
*/
export function onMistake(count, event) {
  console.log("onMistake", count, event);
  const { isNewMistake, newMispellings } = event;
    if (isNewMistake) {
      const editor = document.getElementById('editor');
      const mistakeList = document.getElementById('mistake-list');

      let prevRecent = enlargedWords;

      let left = 20;
      let top = 20;
      prevRecent.forEach(word => {

        if (word.ghost) {
          moveTo(word.ghost, left, top);
          top += word.rect.height;
          mistakeList.style.visibility = 'visible';
          mistakeList.appendChild(word.ghost);
          mistakeList.style.height = `${top + word.rect.height}px`;

          word.ghost.style.pointerEvents = "initial";
        }
      });

      for (const misspelling of newMispellings) {
        if (editor) {
          // makeFall(misspelling);
          enlargeWord(misspelling);
        } else {
          console.error('no editor for', misspelling)
        }
      }
  }

  checkComplete();
}

export function singleton(id) {
  let elt = document.getElementById(id);
  if (elt) {
    return elt;
  }
  elt = document.createElement('div');
  elt.id = id;
  document.body.appendChild(elt);
  return elt;
}