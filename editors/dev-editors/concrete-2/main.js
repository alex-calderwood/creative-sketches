// Remove all spellchecker logic
const grid = document.getElementById('grid');
const ENABLE_GRID = false; // Toggle grid quantization
const charHeight = 30; // Approximate height of a line (20pt font + some padding)
const charWidth = Math.floor(charHeight * 0.6); // Monospace width is typically 60% of height

// a getwidth of text function
function getTextWidth(element, startIndex, endIndex) {
  const text = element.textContent.slice(startIndex, endIndex);
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  // Get the computed style of the element
  const style = window.getComputedStyle(element);
  context.font = `${style.fontSize} ${style.fontFamily}`;
  
  console.log('Getting text width for:', { text, startIndex, endIndex });
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
      const currentText = focusedElement.textContent;
      console.log('Current text:', currentText);
      // console.log('Key pressed:', event.key);

      // randomly select a letter from the text
      // const randomIndex = Math.floor(Math.random() * currentText.length);
      // const randomLetter = currentText[randomIndex];

      const index = currentText.length - 1;
      const letter = currentText[index];

      // add it underneath its current location in the text
      const newElement = document.createElement('div');
      newElement.className = 'editable-element rain';
      newElement.textContent = letter;
      let x = getTextWidth(focusedElement, 0, index);
      const startTop = parseInt(focusedElement.style.top);
      newElement.style.left = `${parseInt(focusedElement.style.left) + x}px`;
      newElement.style.top = `${startTop}px`;
      
      // Calculate distance to bottom of viewport
      const distanceToBottom = window.innerHeight - startTop - charHeight;
      const speed = 200; // pixels per second
      const duration = distanceToBottom / speed;
      newElement.style.setProperty('--distance', `${distanceToBottom}px`);
      newElement.style.setProperty('--duration', `${duration}s`);
      
      newElement.contentEditable = true;
      grid.appendChild(newElement);
    }, 0);

  }
});

// Add click-to-type logic
grid.addEventListener('click', (event) => {
  console.log('Click detected');
  
  // Check if we clicked on an existing editable element
  const clickedElement = event.target.closest('.editable-element');
  console.log('Clicked element:', clickedElement);
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
  
  console.log('Click position:', { x, y, rect });
  
  // Calculate the position in the grid
  const curU = ENABLE_GRID ? Math.floor(x / charWidth) : x;
  const curV = ENABLE_GRID ? Math.floor(y / charHeight) : y;
  
  console.log('Grid position:', { curU, curV });
  
  // Create a new element at the clicked position
  const element = document.createElement('div');
  element.className = 'editable-element';
  element.style.left = `${curU * (ENABLE_GRID ? charWidth : 1)}px`;
  element.style.top = `${curV * (ENABLE_GRID ? charHeight : 1)}px`;
  element.contentEditable = true;
  
  // Handle key events
  element.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newElement = document.createElement('div');
      newElement.className = 'editable-element';
      newElement.style.left = element.style.left;
      newElement.style.top = `${parseInt(element.style.top) + charHeight}px`;
      newElement.contentEditable = true;
      grid.appendChild(newElement);
      newElement.focus();
    }
  });
  
  grid.appendChild(element);
  element.focus();
  
  console.log('Element created and added');
}); 