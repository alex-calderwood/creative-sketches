import { captureScreenshot } from './captureScreenshot.js';
export { captureScreenshot };

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
    const image = await captureScreenshot(editorElement);
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

  doc.setField('content', JSON.stringify(state));
  doc.setField('lastModified', new Date().toISOString());
  save.setMetadata('dateModified', new Date().toISOString());
  save.saveToLocalStorage();
}

function getPhotographableElement() {
  let photoElt = document.querySelector(".photo-region");

  if (!photoElt) {
    photoElt = document.querySelector('#editor-container') || document.querySelector('#editor');
  }

  return photoElt;
}


/**
 * Set the chosen document for a level in metadata
 */
export function setChosenDocumentForLevel(save, levelId, documentId) {
  if (!save) return;
  
  const chosenDocuments = save.getMetadata('chosenDocuments') || {};
  chosenDocuments[levelId] = documentId;
  
  save.setMetadata('chosenDocuments', chosenDocuments);
  save.setMetadata('dateModified', new Date().toISOString());
  save.saveToLocalStorage();
}

/**
 * Get the chosen document for a level from metadata
 */
export function getChosenDocumentForLevel(save, levelId) {
  if (!save) return null;
  
  const chosenDocuments = save.getMetadata('chosenDocuments') || {};
  const chosenDocId = chosenDocuments[levelId];
  
  if (!chosenDocId) return null;
  
  return save.getDocument(chosenDocId);
}

// retrieveTextFromDrift() and getTextFromDocument() were removed — text
// retrieval now goes through ContentQuery.getText(). The legacy
// { queryType: 'levelText', fromLevel } shape was migrated in drifts.json to
// { type: 'content', scope: 'level', filter: 'chosen', target } queries.