let sentences = [];

let gapIndex = 1; // Default to between the first and second sentence
let previewText = "";
let hasSubmitted = false;

// Fetch sentences on load
fetch('/api/sentences')
  .then(res => res.json())
  .then(data => {
    if (Array.isArray(data)) {
      sentences = data;
      // Clamp gapIndex to valid inner gaps only
      if (sentences.length < 2) {
        gapIndex = 1;
      } else {
        gapIndex = Math.max(1, Math.min(gapIndex, sentences.length - 1));
      }
      renderEditor();
      updateArrowDisabled();
    }
  })
  .catch(() => {
    // fallback: keep sentences as empty array
    renderEditor();
  updateArrowDisabled();
  });

// Renders the editor with sentences, arrows, cursor, and preview
function renderEditor() {
  const editor = document.getElementById('editor');
  editor.innerHTML = "";

  // Build the sentence display with cursor and preview
  for (let i = 0; i <= sentences.length; i++) {
    if (i === gapIndex && !hasSubmitted) {
      // Preview text (inserted as a sentence, styled like the others)
      if (previewText) {
        const preview = document.createElement('span');
        preview.textContent = previewText + " ";
        preview.className = "preview-sentence";
        editor.appendChild(preview);
      }
      // Virtual cursor
      const cursor = document.createElement('span');
      cursor.textContent = "";
      cursor.className = "virtual-cursor";
      editor.appendChild(cursor);
    }
    if (i < sentences.length) {
      // Sentence
      const s = document.createElement('span');
      s.textContent = sentences[i] + " ";
      editor.appendChild(s);
    }
  }
}

// Setup arrow event listeners and update their disabled state
function setupArrowListeners() {
  const leftArrow = document.getElementById('gap-arrow-left');
  const rightArrow = document.getElementById('gap-arrow-right');
  if (!leftArrow || !rightArrow) return;

  leftArrow.onclick = () => {
    if (gapIndex > 1) {
      gapIndex--;
      renderEditor();
      updateArrowDisabled();
    }
  };
  rightArrow.onclick = () => {
    if (gapIndex < sentences.length - 1) {
      gapIndex++;
      renderEditor();
      updateArrowDisabled();
    }
  };
  updateArrowDisabled();
}

function updateArrowDisabled() {
  const leftArrow = document.getElementById('gap-arrow-left');
  const rightArrow = document.getElementById('gap-arrow-right');
  if (!leftArrow || !rightArrow) return;
  // Only allow inner gaps
  if (sentences.length < 2) {
    leftArrow.disabled = true;
    rightArrow.disabled = true;
  } else {
    leftArrow.disabled = gapIndex === 1;
    rightArrow.disabled = gapIndex === sentences.length - 1;
  }
}

// Listen for input in the new sentence box
const input = document.getElementById('new-sentence-input');
if (input) {
  input.addEventListener('input', (e) => {
    previewText = e.target.value;
    renderEditor();
  });
}

function renderSubmitView() {
  const newSentenceView = document.getElementById('new-sentence-view');
  const thankYou = document.getElementById('thank-you-message');
  if (!newSentenceView || !thankYou) return;
  if (hasSubmitted) {
    newSentenceView.style.display = 'none';
    thankYou.style.display = '';
  } else {
    newSentenceView.style.display = '';
    thankYou.style.display = 'none';
  }
}

function onSubmit() {
  const input = document.getElementById('new-sentence-input');
  if (!input) return;
  const value = input.value.trim();
  if (!value) return;

  // POST to endpoint with new sentence and index
  fetch('/api/new-sentence', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sentence: value, index: gapIndex })
  }).catch(() => { /* ignore errors for now */ });

  // Insert the new sentence at the gap index
  sentences.splice(gapIndex, 0, value);

  // Reset input and preview
  input.value = '';
  previewText = '';

  // Move cursor after the new sentence
  gapIndex++;

  // Mark as submitted and update submit view
  hasSubmitted = true;
  renderSubmitView();

  // Re-render
  renderEditor();
  updateArrowDisabled();
}

// Initial render and setup
renderEditor();
setupArrowListeners();
renderSubmitView();