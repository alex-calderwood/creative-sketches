const mistakesElement = document.getElementById('mistakes');
// const wordCount = document.getElementById('word-count');

const WORD_GOAL = 22;

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

function getTextWidth(element, startIndex=0, endIndex=null) {
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

function enlargeWord(word) {
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



  console.log({scale, editorWidth, textWidth: getTextWidth(word.element)});

  let newWordElement = animateToRelative(word, dX, dY, scale, 200);

  enlargedWords.push(word);
  return newWordElement;
}

function moveDown(word) {
  const { rect, element: editor } = word;
  let editorBounds = editor.getBoundingClientRect();
  const { left, top, width, height } = rect;
  let dX = editorBounds.left - left + (editorBounds.width / 2);
}

function moveGhostElement(element, leftPx, topPx, speed=500) {
  const timing = {
    duration: speed,
    iterations: 1,
    fill: "forwards" // stay put 
  };
  const animationFrames = [
    { transform: `translateX(0px) translateY(0px)`, left: `${leftPx}px`, top: `${topPx}px`}
  ];
  element.style.position = "absolute";

  // https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Using_the_Web_Animations_API
  element.animate(animationFrames, timing);
}

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

  document.body.appendChild(newElement); 

  word.ghost = newElement;

  // https://developer.mozilla.org/en-US/docs/Web/API/Web_Animations_API/Using_the_Web_Animations_API
  newElement.animate(animationFrames, timing);
}


/* Play the word raining animation */
function makeFall(word) {
  const { text, rect, node, startIndex, endIndex, element: editor } = word;
  for (let i = 0; i < text.length; i++) {
    const fallDelay = i * 50; // 50ms delay between each letter's fall start
    letterFall(text, i, startIndex, endIndex, rect, editor, fallDelay);
  }

  return text.length;
}


function letterFall(text, i, startIndex, endIndex, rect, editor, fallDelay = 0) {
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
function onMistake(count, event) {
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
          moveGhostElement(word.ghost, left, top);
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

  // checkComplete();
}

// function onWordCount(count) {
//   if (wordCount) {
//     let owed = Math.max(0, WORD_GOAL - count);
//     wordCount.textContent = `You owe ${owed} words`.replace(' 0', ' no');
//   }

//   checkComplete();
// }

function checkComplete() {
  let words = window.demoSpellChecker.wordCount();
  let noMistakes = window.demoSpellChecker.numMistakes() <= 0;
  let goalComplete = words >= WORD_GOAL;
  let partway = words > WORD_GOAL / 2;

  // if (!noMistakes && !goalComplete) {
  //   return;
  // }

  // if (goalComplete && noMistakes) {
  //   document.getElementById('submit').classList.add('complete');
  // }

  // if (goalComplete) {
  //   document.getElementById('submit').classList.add('complete');
  // }

  // if (goalComplete && !noMistakes) { // finished with mistakes
  //   document.getElementById('mistakes').classList.add('emphasize')
  // }

  // if (!goalComplete && noMistakes && partway) { // not finished but with no mistakes
  //   // document.getElementById('word-count').classList.add('emphasize')
  // }
}


