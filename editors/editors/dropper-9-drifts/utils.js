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

  let newWordElement = animateToRelative(word, dX, dY, scale, 200);

  enlargedWords.push(word);
  return newWordElement;
}
