import { getScaleModifier } from './src/performances/hyper/block.js';

const assetsFolder = '/editors/assets/rain';
const audioSamples = [];
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

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

// resize a token to a new width and height using the transform property scaleX and scaleY
export function resizeToken(element, width, height) {
  element.style.width = `${width}px`;
  element.style.height = `${height}px`;
  element.style.fontSize = `${height}px`;

  let blockTokenElement = element.querySelector('.block-word');
  blockTokenElement.style.transform = `scaleX(1) scaleY(1)`;
  // blockTokenElement.style.transformOrigin = `center center`;

  let additionalScaleMod = getScaleModifier(element);

  requestAnimationFrame(() => { // make sure it has rendered before measuring
    setTimeout(() => {
    let rect = blockTokenElement.getBoundingClientRect();
    let scaleX = width / rect.width;
    let scaleY = height / rect.height;

    scaleX *= additionalScaleMod.x;
    scaleY *= additionalScaleMod.y;
    
    blockTokenElement.style.transform = `scaleX(${scaleX}) scaleY(${scaleY})`;
    }, 1); // Just 1ms delay helps the calculation be correct
  });
}