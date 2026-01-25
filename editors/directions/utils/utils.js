/**
 * Utility functions
 */

/**
 * Capture a screenshot of an element
 * @param {string} selector - CSS selector for the element to capture
 * @returns {Promise<string>} Data URL of the screenshot (PNG format)
 */
export async function captureScreenshot(selector) {
  const element = document.querySelector(selector);
  if (!element) {
    console.warn(`Element not found for selector: ${selector}`);
    return null;
  }

  let data = null;
  try {
    // Dynamically import html2canvas
    const html2canvas = (await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm')).default;
    
    const canvas = await html2canvas(element, {
      backgroundColor: null,
      scale: 1,
      logging: false
    });

    data = canvas.toDataURL('image/png');

  } catch (error) {
    console.error('Error capturing screenshot:', error);
    return null;
  }

  console.log('Captured image data', data);
  return data

}

/**
 * Download a data URL as a file
 * @param {string} dataUrl - Data URL to download
 * @param {string} filename - Name of the file
 */
export function downloadDataUrl(dataUrl, filename) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

/**
 * Convert data URL to Blob
 * @param {string} dataUrl - Data URL to convert
 * @returns {Blob} Blob object
 */
export function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)[1];
  const bstr = atob(parts[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);
  
  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }
  
  return new Blob([u8arr], { type: mime });
}

/**
 * Save state with screenshot capture
 * Shared helper for both MetaGame submit and MetaGameControls save
 * @param {Object} state - The game state to save
 * @param {Object} save - The GameplaySave instance
 * @param {string} documentId - The document ID
 * @returns {Promise<void>}
 */
export async function saveStateWithImage(state, save, documentId) {
  if (!save || !documentId) {
    console.error('saveStateWithImage: save or documentId is missing', save, documentId);
    return;
  }

  // Capture screenshot for the save
  // Prefer #editor-container if it exists (captures absolutely positioned children)
  // Otherwise fall back to #editor (for editors without a container)
  const editorElement = getPhotographableElement();
  if (editorElement) {
    const selector = editorElement.id ? `#${editorElement.id}` : null;
    const image = await captureScreenshot(selector);
    if (image) {
      state.image = image;
    }
  } else {
    console.warn('Image not captured. No #editor-container or #editor element found.');
  }

  const doc = save.getDocument(documentId);
  if (!doc) {
    console.error('saveStateWithImage: document not found', documentId);
    return;
  }

  console.log('saveStateWithImage: saving state', state);
  doc.setField('content', JSON.stringify(state));
  doc.setField('lastModified', new Date().toISOString());
  save.setMetadata('dateModified', new Date().toISOString());
  save.saveToLocalStorage();

  console.log('saveStateWithImage: saved state', save);
}


function getPhotographableElement() {
  let editorElement = document.querySelector('#editor-container') || document.querySelector('#editor');

  if (!editorElement) {
    editorElement = document.querySelector(".photo-region");
  }

  return editorElement;
}