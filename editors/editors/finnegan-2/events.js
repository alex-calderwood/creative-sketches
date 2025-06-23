const mistakesElement = document.getElementById('mistakes');
const wordCount = document.getElementById('word-count');

const WORD_GOAL = 22;

// Rain functionality from concrete-6
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

function getTextWidth(element, startIndex, endIndex) {
  const text = element.textContent.slice(startIndex, endIndex);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  // Get the computed style of the element
  const style = window.getComputedStyle(element);
  context.font = `${style.fontSize} ${style.fontFamily}`;
  context.textBaseline = 'top';

  
  return context.measureText(text).width;
}

function makeFall(word) {
  const { text, rect, node, startIndex, endIndex, element: editor } = word;

  // randomly select a letter from the text
  let index = text.length - 1;
  let letter = text[index];

  let random = false;
  if (random) {
    index = Math.floor(Math.random() * text.length);
    letter = text[index];
  }

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
  console.log("duration", duration);
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

function onMistake(count, event) {
  console.log("onMistake", event);
  const { isNewMistake, newMispellings } = event;
  console.log(newMispellings);
    if (isNewMistake) {
      const editor = document.getElementById('editor');

      for (const misspelling of newMispellings) {
        if (editor) {
          makeFall(misspelling);
        }
      }
  }

  checkComplete();
}

function onWordCount(count) {
  if (wordCount) {
    let owed = Math.max(0, WORD_GOAL - count);
    wordCount.textContent = `You owe ${owed} words`.replace(' 0', ' no');
  }

  checkComplete();
}

function checkComplete() {
  let words = demoSpellChecker.wordCount();
  let noMistakes = demoSpellChecker.numMistakes() <= 0;
  let goalComplete = words >= WORD_GOAL;
  let partway = words > WORD_GOAL / 2;

  // if (!noMistakes && !goalComplete) {
  //   return;
  // }

  // if (goalComplete && noMistakes) {
  //   document.getElementById('submit').classList.add('complete');
  // }

  if (goalComplete) {
    document.getElementById('submit').classList.add('complete');
  }

  if (goalComplete && !noMistakes) { // finished with mistakes
    document.getElementById('mistakes').classList.add('emphasize')
  }

  // if (!goalComplete && noMistakes && partway) { // not finished but with no mistakes
  //   // document.getElementById('word-count').classList.add('emphasize')
  // }
}
