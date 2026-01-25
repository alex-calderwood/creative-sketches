import { ProjectsHelper } from './utils/projectsHelper.js';
import { GameplaySave } from '/editors/directions/GameplaySave.js';
import { Directions } from './Directions.js';


// Debug views
const SHOW_ALL_EDITORS = false; // Set to true to show all editors below progression

let state = null;
let selectedDocumentId = null;
let selectedLevelId = null;
let directions = null;


/**
 * Get the most recent document image for a specific editor
 */
function getMostRecentImageForEditor(editorId) {
    if (!state) return null;
    
    // Find all documents from this editor
    const editorDocs = state.getAllDocuments().filter(doc => 
        doc.getField('sourceEditor') === editorId
    );
    
    if (editorDocs.length === 0) return null;
    
    // Sort by most recent
    editorDocs.sort((a, b) => {
        const aTime = a.getField('lastModified') || a.getField('createdAt') || '';
        const bTime = b.getField('lastModified') || b.getField('createdAt') || '';
        return new Date(bTime) - new Date(aTime);
    });
    
    // Get the most recent document's image
    const mostRecent = editorDocs[0];
    const content = mostRecent.getField('content');
    
    if (!content) return null;
    
    try {
        const parsed = JSON.parse(content);
        return parsed.image || null;
    } catch (e) {
        return null;
    }
}

function showError(message, ...args) {
    console.error(message, args);
    const errorElement = document.getElementById('errors');
    errorElement.innerHTML = `<div class="error-message">${message}</div>`;
}

// Load projects on page load
async function loadLevels() {
    const allProjects = await ProjectsHelper.getVisibleProjects();
    
    // Get the selected direction from save
    const selectedDirection = state ? state.getMetadata('selectedDirection') : null;
    
    if (!selectedDirection) {
        console.warn('directions-helpers.js: No direction selected', state);
        return;
    }
    
    // Update header with direction name
    const subtitleElement = document.querySelector('.subtitle');
    if (subtitleElement && directions) {
        const directionData = directions.data[selectedDirection];
        const directionDisplayName = directionData?.name || selectedDirection;
        subtitleElement.textContent = directionDisplayName;
    }
    
    // Get progression state with level info for the selected direction
    const { levelsInOrder } = await getProgressionState(selectedDirection);
    
    const levelsList = document.getElementById('levels-list');
    
    if (!levelsList) {
        showError('directions-helpers.js: No levels list found', levelsList);
        return;
    }
    const projectsMap = new Map(allProjects.map(p => [p.url, p]));
    
    // Render levels in progression order
    const progressionHTML = levelsInOrder.map(levelInfo => {
        
        const project = projectsMap.get(levelInfo.editorId);
        if (!project) {
            showError('directions-helpers.js: Project not found', levelInfo);
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
        const selectedClass = selectedLevelId === levelInfo.editorId ? 'selected' : '';
        const imageUrl = isCompleted ? getMostRecentImageForEditor(levelInfo.editorId) : null;
        
        // State 1: Locked
        if (!isUnlocked) {
            return `<div class='level-box-wrapper ${lockClass}' id='level-${levelInfo.editorId.replace(/[^a-zA-Z0-9]/g, '-')}'>
                <div class='level-box ${lockClass}'>
                    <div class='level-lock'>${lockIcon}</div>
                    <div class='level-name'>${displayName}</div>
                    <div class='level-editor'>${project.name}</div>
                </div>
            </div>`;
        }

        // Create a unique ID for this level box to set aspect ratio after image loads
        const levelBoxId = `level-${levelInfo.editorId.replace(/[^a-zA-Z0-9]/g, '-')}`;
        
        // Load image to get actual aspect ratio
        const img = new Image();
        img.onload = function() {
            const aspectRatio = this.width / this.height;
            const imageElement = document.querySelector(`#${levelBoxId} .level-image-behind`);
            if (imageElement) {
                imageElement.style.aspectRatio = aspectRatio;
            }
        };
        img.src = imageUrl;
        
        // Check if this level is selected and has no documents
        const isSelected = selectedLevelId === levelInfo.editorId;
        const editorDocs = state ? state.getAllDocuments().filter(doc => 
            doc.getField('sourceEditor') === levelInfo.editorId
        ) : [];
        const hasNoDocuments = editorDocs.length === 0;
        const buttonName = hasNoDocuments ? 'Begin' : 'Overwrite';
        const beginButton = isSelected 
            ? `<button class="level-begin-action" onclick="replaceDocument('${levelInfo.editorId}', '${project.url}')">${buttonName}</button>` 
            : '';
        
        const clickHandler = isSelected ? '' : `onclick="selectLevel('${levelInfo.editorId}', '${project.url}')"`;
        const hoverHandler = isSelected ? '' : `onmouseover="selectLevel('${levelInfo.editorId}', '${project.url}')"`;
        
        return `<div class="level-box-wrapper ${selectedClass}" id="${levelBoxId}">
            <div class="level-box ${completedClass} ${selectedClass}" ${clickHandler} ${hoverHandler}>
                <div class="level-name">${displayName}</div>
                <div class="level-editor">${project.name}</div>
                ${beginButton}
            </div>
            ${isCompleted && imageUrl ? `<div class="level-image-behind" style="background-image: url('${imageUrl}');"></div>` : ''}

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

async function getProgressionState(selectedDirection) {
    const completedLevels = GameplaySave.hasLocalStorage() 
        ? GameplaySave.fromLocalStorage().getMetadata('completedLevels') || []
        : [];
    
    // Load directions to map levels to editors
    try {
        const directionsData = await Directions.fromFile('/editors/directions/directions.json');
        const levelsInOrder = [];
        
        // Only process the selected direction
        if (!selectedDirection) {
            return { levelsInOrder: [] };
        }
        
        const directionData = directionsData.data[selectedDirection];
        if (!directionData) {
            console.error('Direction not found:', selectedDirection);
            showDirectionNotFound();
            return { levelsInOrder: [] };
        }
        
        const directionDisplayName = directionData.name || selectedDirection;
        const progression = directionData.progression || [];
        const levels = directionsData.getLevels(selectedDirection);
        
        // Find the furthest unlocked position in progression
        let unlockedIndex = -1;
        for (let i = 0; i < progression.length; i++) {
            const levelKey = progression[i];
            if (completedLevels.includes(levelKey)) {
                unlockedIndex = i;
            }
        }
        
        // Separate unlocked and locked levels
        const unlockedLevels = [];
        const lockedLevels = [];
        
        for (let i = 0; i < progression.length; i++) {
            const levelKey = progression[i];
            const level = levels[levelKey];
            if (level?.editor) {
                const levelInfo = {
                    key: levelKey,
                    name: level.name || null,
                    editorId: level.editor,
                    isUnlocked: i <= unlockedIndex + 1,
                    isCompleted: completedLevels.includes(levelKey),
                    directionName: directionDisplayName
                };
                
                if (levelInfo.isUnlocked) {
                    unlockedLevels.push(levelInfo);
                } else {
                    lockedLevels.push(levelInfo);
                }
            }
        }
        
        // Add unlocked first, then locked (no direction headers)
        levelsInOrder.push(...unlockedLevels, ...lockedLevels);
        
        return { levelsInOrder };
    } catch (error) {
        console.error('Error loading progression:', error);
        return { levelsInOrder: [] };
    }
}

function showDirectionNotFound() {
    const directionsHeader = document.getElementById('errors');
    if (directionsHeader) {
        directionsHeader.style.display = 'block';
        directionsHeader.innerHTML = `
            <div class="error-message" onclick="restartState()">
                <p>Direction not found. To start a new game, press here.</p>
            </div>
        `;
    }
}

// Projects will be loaded after directions and state are ready

function updateDirectionsDisplay() {
    if (!directions) return;
    
    const directionsDisplay = document.getElementById('directionsDisplay');
    if (!directionsDisplay) return;
    
    directionsDisplay.innerHTML = directions.getDirectionNames().map(directionName => {
        const levels = directions.getLevels(directionName);
        
        return `<div style="margin-bottom: 20px;">
            <h3>${directionName}</h3>
            ${Object.entries(levels).map(([subName, subData]) => {
                return `<div style="margin-left: 20px; margin-bottom: 15px;">
                    <strong>${subName}</strong>
                    ${Object.entries(subData).map(([key, value]) => {
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
    if (!state) return;
    
    const dateCreated = state.getMetadata('dateCreated');
    const dateModified = state.getMetadata('dateModified');
    
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
        saveStatusElement.textContent = `${state.getAllDocuments().length} documents`;
    }
}

/**
 * Select a document from previous attempts and make it the current for that editor
 */
window.selectDocumentForEditor = function(documentId, editorId) {
    // Get all documents for this editor
    const editorDocs = state ? state.getAllDocuments().filter(doc => 
        doc.getField('sourceEditor') === editorId
    ) : [];
    
    // Sort by most recent
    editorDocs.sort((a, b) => {
        const aTime = a.getField('lastModified') || a.getField('createdAt') || '';
        const bTime = b.getField('lastModified') || b.getField('createdAt') || '';
        return new Date(bTime) - new Date(aTime);
    });
    
    // Re-render the level view with this document as the selected one
    // Move the selected document to the front
    const selectedDoc = editorDocs.find(doc => doc.id === documentId);
    if (selectedDoc) {
        const otherDocs = editorDocs.filter(doc => doc.id !== documentId);
        const reorderedDocs = [selectedDoc, ...otherDocs];
        
        // Find the editor URL
        ProjectsHelper.getProjectUrl(editorId).then(editorUrl => {
            renderDocumentView({ 
                editorId, 
                editorUrl,
                documents: reorderedDocs
            });
        });
    }
};

/**
 * Select a level/editor to view its documents
 */
window.selectLevel = function(editorId, editorUrl) {
    selectedLevelId = editorId;
    selectedDocumentId = null; // Clear document selection
    
    // Update level box styles
    loadLevels();
    
    // Get documents for this editor
    const editorDocs = state ? state.getAllDocuments().filter(doc => 
        doc.getField('sourceEditor') === editorId
    ) : [];
    
    // Sort by most recent
    editorDocs.sort((a, b) => {
        const aTime = a.getField('lastModified') || a.getField('createdAt') || '';
        const bTime = b.getField('lastModified') || b.getField('createdAt') || '';
        return new Date(bTime) - new Date(aTime);
    });
    
    renderDocumentView({ 
        editorId, 
        editorUrl,
        documents: editorDocs 
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
function renderDocumentCard(doc, editorUrl) {
    const title = doc.getField('title') || 'Untitled';
    const content = doc.getField('content') || '';
    const createdAt = doc.getField('createdAt');
    const lastModified = doc.getField('lastModified');
    const sourceEditor = doc.getField('sourceEditor');
    
    const createdDate = createdAt ? new Date(createdAt).toLocaleString() : 'Unknown';
    const modifiedDate = lastModified ? new Date(lastModified).toLocaleString() : 'Not saved yet';
    
    const { imagePreview, contentPreview } = renderDocumentContent(content);
    
    return `
        <div class="document-header">
            <input type="text" class="document-title-input" data-doc-id="${doc.id}" value="${title}">
            <div class="document-metadata">
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
        ${imagePreview}
        <div class="content-section">
            <div class="document-content-preview">${contentPreview || '(empty)'}</div>
        </div>
        <div class="detail-actions">
            ${editorUrl ? `<button onclick="editDocument('${doc.id}', '${editorUrl}')">Edit</button>` : `<button onclick="openDocument('${doc.id}')">Open</button>`}
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
    `;
}

/**
 * Render document view - unified rendering for both single document and level view
 */
function renderDocumentView({ documentId, editorId, editorUrl, documents }) {
    const detailElement = document.getElementById('documentDetail');
    if (!detailElement) return;
    
    detailElement.className = 'document-detail';
    detailElement.style.display = 'block';
    
    // Case 1: Showing a specific document
    if (documentId && state) {
        const doc = state.getDocument(documentId);
        if (!doc) return;
        
        const sourceEditor = doc.getField('sourceEditor');
        
        // Get other documents from the same editor
        const allDocsFromEditor = state.documents.filter(d => 
            d.getField('sourceEditor') === sourceEditor && d.id !== documentId
        );
        
        detailElement.innerHTML = renderDocumentCard(doc, null) + renderOtherDocuments(allDocsFromEditor, documentId);
        
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
        const mostRecentDoc = documents.length > 0 ? documents[0] : null;
        const otherDocs = documents.slice(1);
        
        if (mostRecentDoc) {
            detailElement.innerHTML = renderDocumentCard(mostRecentDoc, editorUrl) + renderOtherDocuments(otherDocs, mostRecentDoc.id);
            
            // Attach blur event to title input
            const titleInput = detailElement.querySelector('.document-title-input');
            if (titleInput) {
                titleInput.addEventListener('blur', () => {
                    saveDocumentTitle(mostRecentDoc.id, titleInput.value);
                });
            }
        }
        return;
    }
    
    // No valid parameters, hide
    detailElement.style.display = 'none';
}

function saveDocumentTitle(documentId, title) {
    if (!state) return;
    
    const doc = state.getDocument(documentId);
    if (!doc) return;
    
    doc.setField('title', title);
    state.setMetadata('dateModified', new Date().toISOString());
    state.saveToLocalStorage();
    
    updateStateDisplay();
}

window.openDocument = async function(documentId) {
    if (!state) return;
    
    const doc = state.getDocument(documentId);
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
    state.setMetadata('dateModified', new Date().toISOString());
    state.saveToLocalStorage();
    
    window.location.href = editorUrl;
};

/**
 * Edit an existing document (mock function for now)
 * TODO: Implement document loading/editing in editor
 */
window.editDocument = function(documentId, editorUrl) {
    // Mock: For now, just navigate to the editor
    // TODO: Set the document as current and load its content
    if (state) {
        state.setMetadata('selectedDocumentId', documentId);
        state.setMetadata('dateModified', new Date().toISOString());
        state.saveToLocalStorage();
    }

    console.log('Edit document:', documentId, 'in editor:', editorUrl);

    window.location.href = `/editors/${editorUrl}/`;
};

/**
 * Replace/create new document in editor (mock function for now)
 * TODO: Clear current document and start fresh
 */
window.replaceDocument = function(editorId, editorUrl) {
    console.log('Replace/create new document in editor:', editorId, editorUrl);
    // Mock: For now, just navigate to the editor
    // TODO: Clear any existing document state
    if (state) {
        state.setMetadata('dateModified', new Date().toISOString());
        state.saveToLocalStorage();
    }
    window.location.href = `/editors/${editorUrl}/`;
};

window.deleteDocument = function(documentId) {
    if (!state) return;
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    // remove the level-image-behind
    // TODO we shouldn't be uisng the editorId but the level id
    let editorId = state.getDocument(documentId).getField('sourceEditor');
    const levelImageBehind = document.querySelector(`#level-${editorId} .level-image-behind`);
    if (levelImageBehind) {
        levelImageBehind.remove();
    }
    
    // remove the detail image
    const detailElement = document.getElementById('documentDetail');
    if (detailElement) {
        detailElement.className = 'document-detail empty';
        detailElement.style.display = 'none';
    }

    state.removeDocument(documentId);
    state.setMetadata('dateModified', new Date().toISOString());
    state.saveToLocalStorage();
    
    selectedDocumentId = null;
    updateStateDisplay();


};

// Initialize detail view as hidden
function initializeDetailView() {
    const detailElement = document.getElementById('documentDetail');
    if (detailElement && !selectedDocumentId) {
        detailElement.style.display = 'none';
    }
}

window.loadSaveState = function() {
    const fileInput = document.getElementById('fileInput');
    fileInput.click();
};

document.getElementById('fileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const saveStatusElement = document.getElementById('saveStatus');
    
    try {
        state = await GameplaySave.loadFromFile(file);
        state.setMetadata('dateModified', new Date().toISOString());
        state.saveToLocalStorage();
        updateStateDisplay();
        loadLevels();
        if (saveStatusElement) {
            saveStatusElement.textContent = 'Save file loaded';
        }
        console.log('Save loaded:', state);
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

window.restartState = function() {
    if (!confirm('Are you sure? This will delete all your documents and start a new game. You may want to first download a backup of your current progress.')) {
        return;
    }
    
    // Clear the save
    localStorage.removeItem('gameplaySave');
    
    // Redirect to landing page to select a new direction
    window.location.href = '/editors/directions/landing.html';
};

window.clearStorage = function() {
    if (!confirm('Are you sure? This will clear all localStorage data.')) {
        return;
    }
    
    localStorage.removeItem('gameplaySave');
    
    // Redirect to landing page
    window.location.href = '/editors/directions/landing.html';
};

window.saveState = function() {
    const saveStatusElement = document.getElementById('saveStatus');
    
    if (!state) {
        if (saveStatusElement) {
            saveStatusElement.textContent = 'No save to download';
        }
        return;
    }
    state.setMetadata('dateModified', new Date().toISOString());
    state.downloadSave();
    updateStateDisplay();
    if (saveStatusElement) {
        saveStatusElement.textContent = 'Save downloaded';
    }
};

// Initialize: Load directions first, then state, then projects
async function initialize() {
    try {
        // Load directions
        directions = await Directions.fromFile('./directions.json');
        updateDirectionsDisplay();
        
        // Load from localStorage - redirect to landing if no save exists
        if (GameplaySave.hasLocalStorage()) {
            state = GameplaySave.fromLocalStorage();
            updateStateDisplay();
        } else {
            // No save found, redirect to landing page without confirmation
            window.location.href = '/editors/directions/landing.html';
            return;
        }
        
        // Now load projects (requires both directions and state)
        await loadLevels();
        
        initializeDetailView();
    } catch (error) {
        console.error('Error initializing:', error);
    }
}

// Start initialization
initialize();
