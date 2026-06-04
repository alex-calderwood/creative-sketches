const grid = document.getElementById('grid');
const ENABLE_GRID = true; // Toggle grid quantization
const charHeight = 30; // Approximate height of a line (20pt font + some padding)
const charWidth = Math.floor(charHeight * 0.6); // Monospace width is typically 60% of height


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
