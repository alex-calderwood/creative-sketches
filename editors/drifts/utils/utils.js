import { Document } from '/editors/drifts/Document.js'
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

export function getTextFromDocument(document) {
  let text = Document.getDefaultContentTextField(document);
  return text;
}


export function retrieveTextFromDrift(save, textQuery) {
  if(!textQuery) {
    console.error("Could not get text from query", textQuery)
    return;
  }

  let isSString = typeof textQuery === "string" || textQuery instanceof String;
  if (isSString) {
    return textQuery;
  }

  if (!textQuery?.queryType) {
    console.error("Could not retrieve text from query. No queryType:", textQuery);
    return null;
  }
  
  if (textQuery?.queryType == 'levelText') {
    let fromLevel = textQuery?.fromLevel;
    if (!fromLevel) {
      console.error(`Retrieve from drift: fromLevel ${fromLevel} not found:`, textQuery)
      return null;
    }

    let referenceDoc = getChosenDocumentForLevel(save, fromLevel);        
    if (referenceDoc) {
      let documentText = getTextFromDocument(referenceDoc);
      let preface = textQuery?.preface != null ? textQuery?.preface + "" : "";
      let suffix  = textQuery?.suffix != null  ? " " + textQuery?.suffix : "";
      let text = `${preface}${documentText}${suffix}`
      return text;
    } else {
      console.warn("Retrieve from drift: No reference document found for level", fromLevel, textQuery)
      return;
    }
  }

  console.error("Text query Type not supported:", textQuery.type, textQuery);
  return null;
}