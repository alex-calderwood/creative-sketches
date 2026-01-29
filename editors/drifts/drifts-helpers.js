import { ProjectsHelper } from './utils/projectsHelper.js';
import { GameplaySave } from '/editors/drifts/GameplaySave.js';
import { Drifts } from './Drifts.js';
import { setChosenDocumentForLevel, getChosenDocumentForLevel } from './utils/utils.js';


// Debug views
const SHOW_ALL_EDITORS = false; // Set to true to show all editors below progression

let save = null;
let selectedDocumentId = null;
let selectedLevelId = null;
let drifts = null;


function showError(message, ...args) {
    console.error(message, args);
    const errorElement = document.getElementById('errors');
    errorElement.innerHTML = `<div class="error-message">${message}</div>`;
}

// Load projects on page load
async function loadLevels() {
    const allProjects = await ProjectsHelper.getVisibleProjects();
    
    // Get the selected drift from save
    const selectedDrift = save ? save.getMetadata('selectedDrift') : null;
    
    if (!selectedDrift) {
        console.warn('drifts-helpers.js: No drift selected', save);
        return;
    }
    
    // Update header with drift name
    const subtitleElement = document.querySelector('.subtitle');
    if (subtitleElement && drifts) {
        const driftData = drifts.data[selectedDrift];
        const driftDisplayName = driftData?.name || selectedDrift;
        subtitleElement.textContent = driftDisplayName;
    }
    
    // Get progression state with level info for the selected drift
    const { levelsInOrder } = await getProgressionState(selectedDrift);

    const levelsList = document.getElementById('levels-list');
    
    if (!levelsList) {
        showError('drifts-helpers.js: No levels list found', levelsList);
        return;
    }
    const projectsMap = new Map(allProjects.map(p => [p.url, p]));
    
    // Render levels in progression order
    const progressionHTML = levelsInOrder.map(levelInfo => {
        
        const project = projectsMap.get(levelInfo.editorId);
        if (!project) {
            showError('drifts-helpers.js: Project not found', levelInfo);
            return '';
        }
        
        const lockClass = levelInfo.isUnlocked ? '' : 'locked';
        const lockIcon = levelInfo.isUnlocked ? '' : '🔒 ';
        
        // Use level name if available, otherwise use project name
        const displayName = levelInfo.name || project.name;
        
        // Three states: locked, unlocked-uncompleted, unlocked-completed
        const isCompleted = levelInfo.isCompleted;
        const isUnlocked = levelInfo.isUnlocked;
        const completedClass = isCompleted ? 'completed' : '';
        const selectedClass = selectedLevelId === levelInfo.key ? 'selected' : '';

        // Get image from chosen document's content field
        const selectedDocumentForLevel = getChosenDocumentForLevel(save, levelInfo.key);
        let imageUrl = null;
        if (selectedDocumentForLevel) {
            const content = selectedDocumentForLevel.getField('content');
            if (content) {
                try {
                    const parsedContent = JSON.parse(content);
                    imageUrl = parsedContent.image || null;
                } catch (e) {
                    imageUrl = null;
                }
            }
        }

        // State 1: Locked
        if (!isUnlocked) {
            return `<div class='level-box-wrapper ${lockClass}' id='level-${levelInfo.editorId.replace(/[^a-zA-Z0-9]/g, '-')}'>
                    <div class='level-box ${lockClass}'>
                    <div class='level-lock'>${lockIcon}</div>
                </div>
                <div class='level-info'>
                    <div class='level-name'>${displayName}</div>
                    <div class='level-editor'>${project.name}</div>
                </div>
            </div>`;
        }

        // Create a unique ID for this level box to set aspect ratio after image loads
        const levelBoxId = `level-${levelInfo.editorId.replace(/[^a-zA-Z0-9]/g, '-')}`;
        
        // Check if this level is selected and has no documents
        const isSelected = selectedLevelId === levelInfo.key;
        const levelDocs = save ? save.getAllDocuments().filter(doc => 
            doc.getField('levelId') === levelInfo.key
        ) : [];

        const hasNoDocuments = levelDocs.length === 0;
        const buttonName = hasNoDocuments ? 'Begin' : 'Replace';
        const beginButton = isSelected || hasNoDocuments
            ? `<button class="level-begin-action" onclick="newDocumentForLevel('${levelInfo.key}', '${levelInfo.editorId}', '${project.url}')">${buttonName}</button>` 
            : '';
        
        const clickHandler = isSelected ? '' : `onclick="selectLevel('${levelInfo.key}', '${levelInfo.editorId}', '${project.url}')"`;
        // const hoverHandler = isSelected ? '' : `onmouseover="selectLevel('${levelInfo.key}', '${levelInfo.editorId}', '${project.url}')"`;
        
        return `<div class="level-box-wrapper ${selectedClass}" id="${levelBoxId}">
            <div class="level-box ${completedClass} ${selectedClass}" ${clickHandler}>
                ${isCompleted && imageUrl ? `<img class="level-image-inside" src="${imageUrl}" alt="${displayName}" />` : ''}
                ${beginButton}
            </div>
                <div class='level-info'>
                    <div class='level-name'>${displayName}</div>
                    <div class='level-editor'>${project.name}</div>
                    <br>
                </div>
        </div>`;
        
    }).join('');
    
    // Optionally show all other editors
    let otherEditorsHTML = '';
    if (SHOW_ALL_EDITORS) {
        const usedEditors = levelsInOrder.map(l => l.editorId);
        const otherProjects = allProjects.filter(p => !usedEditors.includes(p.url));
        if (otherProjects.length > 0) {
            otherEditorsHTML = '<hr style="margin: 20px 0;">' + 
                '<div style="opacity: 0.6; margin: 10px 20px;">Other Editors:</div>' +
                otherProjects.map(project => 
                    `<div class="project-nav"><a href="/editors/${project.url}/">${project.name}</a></div>`
                ).join('');
        }
    }
    
    levelsList.innerHTML = progressionHTML + otherEditorsHTML;
}

async function getProgressionState(selectedDrift) {

    const save = GameplaySave.hasLocalStorage() 
        ? GameplaySave.fromLocalStorage()
        : null;

    const completedLevels = save?.getMetadata('completedLevels') || [];
    const allUnlocked = save?.getMetadata('allUnlocked') || false;
    
    // Load drifts to map levels to editors
    try {
        const driftsData = await Drifts.fromFile('/editors/drifts/drifts.json');
        const levelsInOrder = [];
        
        // Only process the selected drift
        if (!selectedDrift) {
            return { levelsInOrder: [] };
        }
        
        const driftData = driftsData.data[selectedDrift];
        if (!driftData) {
            console.error('Drift not found:', selectedDrift);
            showDriftNotFound();
            return { levelsInOrder: [] };
        }
        
        const driftDisplayName = driftData.name || selectedDrift;
        const progression = driftData.progression || [];
        const levels = driftsData.getLevels(selectedDrift);
        
        // Find the furthest unlocked position in progression
        let unlockedIndex = -1;
        for (let i = 0; i < progression.length; i++) {
            const levelId = progression[i];
            if (completedLevels.includes(levelId)) {
                unlockedIndex = i;
            }
        }
        
        // Separate unlocked and locked levels
        const unlockedLevels = [];
        const lockedLevels = [];
        
        for (let i = 0; i < levels.length; i++) {
            const level = levels[i];
            if (level?.editor) {
                // Find this level's position in the progression array
                const progressionIndex = progression.indexOf(level.id);
                
                const levelInfo = {
                    key: level.id,
                    name: level.name || null,
                    editorId: level.editor,
                    isUnlocked: allUnlocked || progressionIndex <= unlockedIndex + 1,
                    isCompleted: completedLevels.includes(level.id),
                    driftName: driftDisplayName
                };
                
                if (levelInfo.isUnlocked) {
                    unlockedLevels.push(levelInfo);
                } else {
                    lockedLevels.push(levelInfo);
                }
            }
        }
        
        // Add unlocked first, then locked (no drift headers)
        levelsInOrder.push(...unlockedLevels, ...lockedLevels);
        
        return { levelsInOrder };
    } catch (error) {
        console.error('Error loading progression:', error);
        return { levelsInOrder: [] };
    }
}

function showDriftNotFound() {
    const driftsHeader = document.getElementById('errors');
    if (driftsHeader) {
        driftsHeader.style.display = 'block';
        driftsHeader.innerHTML = `
            <div class="error-message" onclick="goToNewGame()">
                <p>Drift not found. To start a new game, press here.</p>
            </div>
        `;
    }
}

// Projects will be loaded after drifts and state are ready

function updateDriftsDisplay() {
    if (!drifts) return;
    
    const driftsDisplay = document.getElementById('driftsDisplay');
    if (!driftsDisplay) return;
    
    driftsDisplay.innerHTML = drifts.getDriftNames().map(driftName => {
        const levels = drifts.getLevels(driftName);
        
        return `<div style="margin-bottom: 20px;">
            <h3>${driftName}</h3>
            ${levels.map(level => {
                return `<div style="margin-left: 20px; margin-bottom: 15px;">
                    <strong>${level.name}</strong>
                    ${Object.entries(level).map(([key, value]) => {
                        if (Array.isArray(value)) {
                            return `<div><em>${key}:</em> <ul>${value.map(v => `<li>${v}</li>`).join('')}</ul></div>`;
                        } else if (typeof value === 'object') {
                            return `<div><em>${key}:</em> <pre>${JSON.stringify(value, null, 2)}</pre></div>`;
                        } else {
                            return `<div><em>${key}:</em> ${value}</div>`;
                        }
                    }).join('')}
                </div>`;
            }).join('')}
        </div>`;
    }).join('');
}

function updateStateDisplay() {
    if (!save) return;
    
    const dateCreated = save.getMetadata('dateCreated');
    const dateModified = save.getMetadata('dateModified');
    
    const created = dateCreated ? new Date(dateCreated).toLocaleString() : 'Unknown';
    const modified = dateModified ? new Date(dateModified).toLocaleString() : 'Unknown';
    
    const dateCreatedElement = document.getElementById('dateCreated');
    const dateModifiedElement = document.getElementById('dateModified');
    const saveStatusElement = document.getElementById('saveStatus');
    
    if (dateCreatedElement) {
        dateCreatedElement.textContent = `Created: ${created}`;
    }
    if (dateModifiedElement) {
        dateModifiedElement.textContent = `Modified: ${modified}`;
    }
    if (saveStatusElement) {
        saveStatusElement.textContent = `${save.getAllDocuments().length} documents`;
    }
}


/**
 * View a specific document (switches the view to show this document)
 */
window.selectDocument = function(documentId) {
    if (!save) return;
    
    const doc = save.getDocument(documentId);
    if (!doc) return;
    
    selectedDocumentId = documentId;
    
    // Render this document's view
    renderDocumentView({ documentId });
};

/**
 * Select a document as the chosen one for a level
 */
window.selectDocumentForLevel = function(documentId, levelId) {
    if (!save) return;
    
    const doc = save.getDocument(documentId);
    if (!doc) return;
    
    // If levelId is not provided, get it from the document
    const actualLevelId = levelId || doc.getField('levelId');
    if (!actualLevelId) {
        console.error('No levelId found for document:', documentId);
        return;
    }
    
    // Set this document as the chosen one for the level
    setChosenDocumentForLevel(save, actualLevelId, documentId);
    
    // Reload the level view to show the newly chosen document
    loadLevels();
    
    // Re-render the document view
    const levelDocs = save.getAllDocuments().filter(d => 
        d.getField('levelId') === actualLevelId
    );
    
    // Find editor info for this level
    const sourceEditor = doc.getField('sourceEditor');
    renderDocumentView({ 
        levelId: actualLevelId,
        editorId: sourceEditor,
        editorUrl: sourceEditor,
        documents: levelDocs 
    });
};

/**
 * Select a level to view its documents
 */
window.selectLevel = function(levelId, editorId, editorUrl) {
    selectedLevelId = levelId;
    selectedDocumentId = null; // Clear document selection
    
    // Store the selected level key in save metadata
    if (save) {
        save.setMetadata('selectedlevelId', levelId);
        save.setMetadata('dateModified', new Date().toISOString());
        save.saveToLocalStorage();
    }
    
    // Update level box styles
    loadLevels();
    
    // Get documents for this level
    const levelDocs = save ? save.getAllDocuments().filter(doc => 
        doc.getField('levelId') === levelId
    ) : [];
    
    // Sort by most recent
    levelDocs.sort((a, b) => {
        const aTime = a.getField('lastModified') || a.getField('createdAt') || '';
        const bTime = b.getField('lastModified') || b.getField('createdAt') || '';
        return new Date(bTime) - new Date(aTime);
    });
    
    renderDocumentView({ 
        levelId,
        editorId, 
        editorUrl,
        documents: levelDocs 
    });
};

/**
 * Helper function to render document content (image + text preview)
 */
function renderDocumentContent(content) {
    let imagePreview = '';
    let contentPreview = '';
    
    try {
        const parsedContent = JSON.parse(content);
        if (parsedContent.image) {
            imagePreview = `<div class="image-preview"><img src="${parsedContent.image}" alt="Document preview" /></div>`;
        }
        if (parsedContent.text) {
            contentPreview = parsedContent.text;
        } else {
            contentPreview = content;
        }
    } catch (e) {
        contentPreview = content;
    }
    
    return { imagePreview, contentPreview };
}

/**
 * Helper function to render a single document detail card
 */
function renderDocumentCard(doc, level, editorUrl) {
    const title = doc.getField('title') || 'Untitled';
    const content = doc.getField('content') || '';
    const createdAt = doc.getField('createdAt');
    const lastModified = doc.getField('lastModified');
    const sourceEditor = doc.getField('sourceEditor');
    const levelId = level || doc.getField('levelId');
    
    const createdDate = createdAt ? new Date(createdAt).toLocaleString() : 'Unknown';
    const modifiedDate = lastModified ? new Date(lastModified).toLocaleString() : 'Not saved yet';
    
    const { imagePreview, contentPreview } = renderDocumentContent(content);
    
    // Check if this document is the chosen one for its level
    const chosenDoc = getChosenDocumentForLevel(save, levelId);
    const isChosen = chosenDoc && chosenDoc.id === doc.id;
    const selectButtonText = isChosen ? '✓ Chosen' : 'Select Document';
    const selectButtonClass = isChosen ? 'chosen-document' : '';

    console.log(contentPreview)
    
    return `
        ${imagePreview}
        <div class="document-header">
            <div class="document-metadata">
                <input type="text" class="document-title-input" data-doc-id="${doc.id}" value="${title}">

                <div class="metadata-item">
                    <span class="metadata-label">Created</span>
                    <span class="metadata-value">${createdDate}</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">Modified</span>
                    <span class="metadata-value">${modifiedDate}</span>
                </div>
                <div class="metadata-item">
                    <span class="metadata-label">Editor</span>
                    <span class="metadata-value">${sourceEditor || 'Unknown'}</span>
                </div>
            </div>
        </div>
        <div class="content-section">
            <div class="document-content-preview">${contentPreview || '(empty)'}</div>
        </div>
        <div class="detail-actions">
            ${editorUrl ? `<button onclick="editDocument('${doc.id}', '${editorUrl}')">Edit</button>` : `<button onclick="openDocument('${doc.id}')">Open</button>`}
            <button class="${selectButtonClass}" onclick="selectDocumentForLevel('${doc.id}', '${levelId}')">${selectButtonText}</button>
            <button onclick="deleteDocument('${doc.id}')">Delete</button>
        </div>
    `;
}

/**
 * Helper function to render other documents list
 */
function renderOtherDocuments(docs, currentDocId) {
    if (docs.length === 0) {
        return '';
    }
    
    return `
        <div class="other-documents">
            <h4>Other Documents</h4>
            <div class="compact-doc-list">
                ${docs.map(doc => {
                    const title = doc.getField('title') || 'Untitled';
                    const createdAt = doc.getField('createdAt');
                    const createdDate = createdAt ? new Date(createdAt).toLocaleDateString() : 'Unknown';
                    return `
                        <div class="compact-doc-item" onclick="selectDocument('${doc.id}')">
                            <span class="compact-doc-title">${title}</span>
                            <span class="compact-doc-date">${createdDate}</span>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
        <div class="spacer"></div>
    `;
}

/**
 * Render document view - unified rendering for both single document and level view
 */
function renderDocumentView({ documentId, editorId, editorUrl, documents }) {
    const detailElement = document.getElementById('documentDetail');
    if (!detailElement) return;
    
    detailElement.className = 'document-detail';
    
    // Case 1: Showing a specific document
    if (documentId && save) {
        const doc = save.getDocument(documentId);
        if (!doc) return;
        
        const levelId = doc.getField('levelId');
        
        // Get other documents from the same level
        const allDocsFromLevel = save.getAllDocuments().filter(d => 
            d.getField('levelId') === levelId && d.id !== documentId
        );
        
        detailElement.innerHTML = renderDocumentCard(doc, levelId, null) + renderOtherDocuments(allDocsFromLevel, documentId);
        
        // Attach blur event to title input
        const titleInput = detailElement.querySelector('.document-title-input');
        if (titleInput) {
            titleInput.addEventListener('blur', () => {
                saveDocumentTitle(documentId, titleInput.value);
            });
        }
        return;
    }
    
    // Case 2: Showing a level's documents
    if (editorId && documents !== undefined) {
        // Get the chosen document for this level, or fall back to most recent
        const chosenDoc = getChosenDocumentForLevel(save, selectedLevelId);
        const displayDoc = chosenDoc || (documents.length > 0 ? documents[0] : null);
        
        // Auto-select if there's only one document and no chosen document yet
        if (documents.length === 1 && !chosenDoc && selectedLevelId) {
            setChosenDocumentForLevel(save, selectedLevelId, documents[0].id);
        }
        
        // Filter out the displayed document from other docs
        const otherDocs = documents.filter(doc => doc.id !== displayDoc?.id);
        
        if (displayDoc) {
            detailElement.innerHTML = renderDocumentCard(displayDoc, selectedLevelId, editorUrl) + renderOtherDocuments(otherDocs, displayDoc.id);
            
            // Attach blur event to title input
            const titleInput = detailElement.querySelector('.document-title-input');
            if (titleInput) {
                titleInput.addEventListener('blur', () => {
                    saveDocumentTitle(displayDoc.id, titleInput.value);
                });
            }
        }
        return;
    }
    
    // No valid parameters, hide
    detailElement.style.display = 'none';
}

function saveDocumentTitle(documentId, title) {
    if (!save) return;
    
    const doc = save.getDocument(documentId);
    if (!doc) return;
    
    doc.setField('title', title);
    save.setMetadata('dateModified', new Date().toISOString());
    save.saveToLocalStorage();
    
    updateStateDisplay();
}

window.openDocument = async function(documentId) {
    if (!save) return;
    
    const doc = save.getDocument(documentId);
    if (!doc) return;
    
    const sourceEditor = doc.getField('sourceEditor');
    
    // Fetch project URL from server
    const { ProjectsHelper } = await import('./utils/projectsHelper.js');
    const editorUrl = await ProjectsHelper.getProjectUrl(sourceEditor);
    
    if (!editorUrl) {
        console.error('Unknown editor:', sourceEditor);
        return;
    }
    
    // Set as current document and navigate
    save.setMetadata('dateModified', new Date().toISOString());
    save.saveToLocalStorage();
    
    window.location.href = editorUrl;
};

/**
 * Edit an existing document (mock function for now)
 * TODO: Implement document loading/editing in editor
 */
window.editDocument = function(documentId, editorUrl) {
    // Mock: For now, just navigate to the editor
    // TODO: Set the document as current and load its content
    if (save) {
        save.setMetadata('selectedDocumentId', documentId);
        save.setMetadata('dateModified', new Date().toISOString());
        save.saveToLocalStorage();
    }

    console.log('Edit document:', documentId, 'in editor:', editorUrl);

    window.location.href = `/editors/${editorUrl}/`;
};

/**
 * Create a new document for that level and begin.
 */
window.newDocumentForLevel = function(levelId, editorId, editorUrl) {
    console.log('Create new document for level:', levelId, editorId, editorUrl);
    // Store the selected level key in save metadata
    if (save) {
        save.setMetadata('selectedlevelId', levelId);
        save.setMetadata('selectedDocumentId', null); // Clear selected document to force new creation
        save.setMetadata('dateModified', new Date().toISOString());
        save.saveToLocalStorage();
    }
    window.location.href = `/editors/${editorUrl}/`;
};

window.deleteDocument = function(documentId) {
    if (!save) return;
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    // Get document info before deleting
    const doc = save.getDocument(documentId);
    const levelId = doc.getField('levelId');
    const editorId = doc.getField('sourceEditor');
    
    // If this was the chosen document for this level, clear it
    const chosenDocuments = save.getMetadata('chosenDocuments') || {};
    if (chosenDocuments[levelId] === documentId) {
        delete chosenDocuments[levelId];
        save.setMetadata('chosenDocuments', chosenDocuments);
    }
    
    // remove the level-image-inside
    const levelBoxId = `level-${editorId.replace(/[^a-zA-Z0-9]/g, '-')}`;
    const levelImageInside = document.querySelector(`#${levelBoxId} .level-image-inside`);
    if (levelImageInside) {
        levelImageInside.remove();
    }
    
    // remove the detail image
    const detailElement = document.getElementById('documentDetail');
    if (detailElement) {
        detailElement.className = 'document-detail';
    }

    save.removeDocument(documentId);
    save.setMetadata('dateModified', new Date().toISOString());
    save.saveToLocalStorage();
    
    selectedDocumentId = null;
    updateStateDisplay();
    
    // Reload levels to update the chosen document display
    loadLevels();
};


window.loadSaveState = function() {
    const fileInput = document.getElementById('fileInput');
    fileInput.click();
};

document.getElementById('fileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const saveStatusElement = document.getElementById('saveStatus');
    
    try {
        save = await GameplaySave.loadFromFile(file);
        save.setMetadata('dateModified', new Date().toISOString());
        save.saveToLocalStorage();
        updateStateDisplay();
        loadLevels();
        if (saveStatusElement) {
            saveStatusElement.textContent = 'Save file loaded';
        }
        console.log('Save loaded:', save);
    } catch (error) {
        if (saveStatusElement) {
            saveStatusElement.textContent = `Error: ${error.message}`;
        }
        console.error('Error loading save:', error);
    }
});

window.openOptionsMenu = function() {
    document.getElementById('options-modal').style.display = 'flex';
};

window.closeOptionsMenu = function() {
    document.getElementById('options-modal').style.display = 'none';
};

window.goToNewGame = function() {

    // Redirect to landing page to select a new drift
    window.location.href = '/editors/drifts/landing.html';
};

window.clearStorage = function() {
    if (!confirm('Are you sure? This will clear all localStorage data.')) {
        return;
    }
    
    localStorage.removeItem('gameplaySave');
    
    // Redirect to landing page
    window.location.href = '/editors/drifts/landing.html';
};

window.saveState = function() {
    const saveStatusElement = document.getElementById('saveStatus');
    
    if (!save) {
        if (saveStatusElement) {
            saveStatusElement.textContent = 'No save to download';
        }
        return;
    }
    save.setMetadata('dateModified', new Date().toISOString());
    save.downloadSave();
    updateStateDisplay();
    if (saveStatusElement) {
        saveStatusElement.textContent = 'Save downloaded';
    }
};

// Initialize: Load drifts first, then state, then projects
async function initialize() {
    try {
        // Load drifts
        drifts = await Drifts.fromFile('./drifts.json');
        updateDriftsDisplay();
        
        // Load from localStorage - redirect to landing if no save exists
        if (GameplaySave.hasLocalStorage()) {
            save = GameplaySave.fromLocalStorage();
            updateStateDisplay();
        } else {
            // No save found, redirect to landing page without confirmation
            window.location.href = '/editors/drifts/landing.html';
            return;
        }
        
        // Now load projects (requires both drifts and state)
        await loadLevels();
        
    } catch (error) {
        console.error('Error initializing:', error);
    }
}

// Start initialization
initialize();
