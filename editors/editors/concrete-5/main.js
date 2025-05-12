// Remove all spellchecker logic
const grid = document.getElementById('grid');
const ENABLE_GRID = false; // Toggle grid quantization
const charHeight = 30; // Approximate height of a line (20pt font + some padding)
const charWidth = Math.floor(charHeight * 0.6); // Monospace width is typically 60% of height

// Load all audio samples
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
  
  // console.log('Getting text width for:', { text, startIndex, endIndex });
  return context.measureText(text).width;
}

// Global keydown handler for all keystrokes
grid.addEventListener('keydown', (event) => {
  const focusedElement = document.activeElement;
  if (focusedElement && focusedElement.classList.contains('editable-element')) {
    // Prevent newlines
    if (event.key === 'Enter') {
      event.preventDefault();
      return;
    }
    
    // Wait for next tick to get updated text content
    setTimeout(() => {
      
    }, 0);
  }
});

// Add click-to-type logic
grid.addEventListener('click', (event) => {
  // Check if we clicked on an existing editable element
  const clickedElement = event.target.closest('.editable-element');
  // console.log('Clicked element:', clickedElement);
  if (clickedElement) {
    // If the element is already focused, let the default behavior handle it
    if (document.activeElement === clickedElement) {
      return;
    }
    
    // Get click position relative to the element
    const rect = clickedElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    
    // Create a range at the clicked position
    const range = document.caretRangeFromPoint(event.clientX, event.clientY);
    if (range) {
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
    }
    clickedElement.focus();
    return;
  }
  
  const rect = grid.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  
  // Calculate the position in the grid
  const curU = ENABLE_GRID ? Math.floor(x / charWidth) : x;
  const curV = ENABLE_GRID ? Math.floor(y / charHeight) : y;
  
  // console.log('Grid position:', { curU, curV });
  
  // Create a new element at the clicked position
  const element = document.createElement('div');
  element.className = 'editable-element';
  element.style.left = `${curU * (ENABLE_GRID ? charWidth : 1)}px`;
  element.style.top = `${curV * (ENABLE_GRID ? charHeight : 1)}px`;
  element.contentEditable = true;
  element.spellcheck = false;
  
  // Handle key events
  element.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newElement = document.createElement('div');
      newElement.className = 'editable-element';
      newElement.style.left = element.style.left;
      newElement.style.top = `${parseInt(element.style.top) + charHeight}px`;
      newElement.contentEditable = true;
      newElement.spellcheck = false;
      grid.appendChild(newElement);
      newElement.focus();
    }
    setTimeout(() => {
      let length = rainElement(element);
    }, 0);

  });

  grid.appendChild(element);
  element.focus();
}); 

function rainElement(element) {
  const currentText = element.textContent;

  // randomly select a letter from the text
  let index = currentText.length - 1;
  let letter = currentText[index];

  let random = false;
  if (random) {
    index = Math.floor(Math.random() * currentText.length);
    letter = currentText[index];
  }

  const newElement = document.createElement('div');
  newElement.className = 'editable-element rain';
  newElement.textContent = letter;
  let x = getTextWidth(element, 0, index);
  const startTop = parseInt(element.style.top);
  newElement.style.left = `${parseInt(element.style.left) + x}px`;
  newElement.style.top = `${startTop}px`;
  newElement.contentEditable = true;
  newElement.spellcheck = false;

  // Calculate distance to bottom of viewport
  const distanceToBottom = window.innerHeight - startTop - charHeight;
  const speed = 400; // pixels per second
  const duration = distanceToBottom / speed;
  newElement.style.setProperty('--distance', `${distanceToBottom}px`);
  newElement.style.setProperty('--duration', `${duration}s`);

  grid.appendChild(newElement);

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
        // console.log(`Playing rain${randomIndex + 1}.wav`);
      }
    }, duration * 1000 * cssChange); // Convert seconds to milliseconds // 0.9 = where in the ccs animation it plays
  }

  return currentText.length;
}
