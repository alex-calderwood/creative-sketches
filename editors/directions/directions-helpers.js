import { ProjectsHelper } from './utils/projectsHelper.js';
import { GameplaySave } from './GameplaySave.js';
import { Document } from './Document.js';
import { Directions } from './Directions.js';


// Debug views
const SHOW_ALL_EDITORS = false; // Set to true to show all editors below progression

let state = null;
let selectedDocumentId = null;
let directions = null;


// Load projects on page load
async function loadProjects() {
    
    const allProjects = await ProjectsHelper.getVisibleProjects();
    console.log('allProjects', allProjects);
    
    // Get progression state with level info
    const { levelsInOrder } = await getProgressionState();
    
    const projectsList = document.getElementById('projects-list');
    
    if (projectsList) {
        const projectsMap = new Map(allProjects.map(p => [p.url, p]));
        
        // Render levels in progression order
        const progressionHTML = levelsInOrder.map(levelInfo => {
            // Direction header
            if (levelInfo.isDirectionHeader) {
                return `<div class="direction-header">${levelInfo.directionName}</div>`;
            }
            
            const project = projectsMap.get(levelInfo.editorId);
            if (!project) return '';
            
            const lockClass = levelInfo.isUnlocked ? '' : 'locked';
            const lockIcon = levelInfo.isUnlocked ? '' : '🔒 ';
            
            // Use level name if available, otherwise use project name
            const displayName = levelInfo.name || project.name;
            
            if (levelInfo.isUnlocked) {
                return `<a href="/editors/${project.url}/" class="level-box ${lockClass}">
                    <div class="level-name">${displayName}</div>
                    <div class="level-editor">${project.name}</div>
                </a>`;
            } else {
                return `<div class="level-box ${lockClass}">
                    <div class="level-lock">${lockIcon}</div>
                    <div class="level-name">${displayName}</div>
                    <div class="level-editor">${project.name}</div>
                </div>`;
            }
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
        
        projectsList.innerHTML = progressionHTML + otherEditorsHTML;
    }
}

async function getProgressionState() {
    const completedLevels = GameplaySave.hasLocalStorage() 
        ? GameplaySave.fromLocalStorage().getMetadata('completedLevels') || []
        : [];
    
    // Load directions to map levels to editors
    try {
        const directionsData = await Directions.fromFile('/editors/directions/directions.json');
        const levelsInOrder = [];
        
        // Build list of levels in progression order
        for (const directionName of directionsData.getDirectionNames()) {
            const directionData = directionsData.data[directionName];
            const directionDisplayName = directionData.name || directionName;
            const progression = directionData.progression || [];
            const levels = directionsData.getLevels(directionName);
            
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
                        directionName: directionDisplayName
                    };
                    
                    if (levelInfo.isUnlocked) {
                        unlockedLevels.push(levelInfo);
                    } else {
                        lockedLevels.push(levelInfo);
                    }
                }
            }
            
            // Add direction header if there are levels
            if (unlockedLevels.length > 0 || lockedLevels.length > 0) {
                levelsInOrder.push({
                    isDirectionHeader: true,
                    directionName: directionDisplayName
                });
            }
            
            // Add unlocked first, then locked
            levelsInOrder.push(...unlockedLevels, ...lockedLevels);
        }
        
        return { levelsInOrder };
    } catch (error) {
        console.error('Error loading progression:', error);
        return { levelsInOrder: [] };
    }
}

// Initialize projects
loadProjects();

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
    
    updateDocumentsList();
}

function updateDocumentsList() {
    const documentsListElement = document.getElementById('documentsList');
    if (!documentsListElement || !state) return;
    
    let documents = state.getAllDocuments();
    documents.sort((a, b) => {
        const aTime = a.getField('lastModified') || a.getField('createdAt');
        const bTime = b.getField('lastModified') || b.getField('createdAt');
        return new Date(bTime) - new Date(aTime);
    });

    
    if (documents.length === 0) {
        documentsListElement.innerHTML = '<p>No documents yet</p>';
        return;
    }
    
    documentsListElement.innerHTML = documents.map(doc => {
        const title = doc.getField('title') || 'Untitled';
        const createdAt = doc.getField('createdAt');
        const sourceEditor = doc.getField('sourceEditor');
        const createdDate = createdAt ? new Date(createdAt).toLocaleString() : 'Unknown';
        const isSelected = doc.id === selectedDocumentId ? 'selected' : '';
        
        return `
            <div class="document-item ${isSelected}" onclick="selectDocument('${doc.id}')">
                <div class="doc-id">${title}</div>
                <div class="doc-meta">Editor: ${sourceEditor || 'Unknown'}</div>
                <div class="doc-meta">Created: ${createdDate}</div>
            </div>
        `;
    }).join('');
}

window.selectDocument = function(documentId) {
    selectedDocumentId = documentId;
    updateDocumentsList();
    showDocumentDetail(documentId);
};

function showDocumentDetail(documentId) {
    const detailElement = document.getElementById('documentDetail');
    if (!detailElement || !state) return;
    
    const doc = state.getDocument(documentId);
    if (!doc) return;
    
    const title = doc.getField('title') || 'Untitled';
    const createdAt = doc.getField('createdAt');
    const lastModified = doc.getField('lastModified');
    const sourceEditor = doc.getField('sourceEditor');
    const content = doc.getField('content') || '';
    
    const createdDate = createdAt ? new Date(createdAt).toLocaleString() : 'Unknown';
    const modifiedDate = lastModified ? new Date(lastModified).toLocaleString() : 'Not saved yet';
    
    // Try to parse content to check for image and text
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
        // Content is not JSON, use as-is
        contentPreview = content;
    }
    
    detailElement.className = 'document-detail';
    detailElement.style.display = 'block';
    detailElement.innerHTML = `
        <div class="detail-section">
            <input type="text" id="document-title-input" value="${title}" >
        </div>
        ${imagePreview}
        <div class="content-section">
            <div class="document-content-preview">${contentPreview || '(empty)'}</div>
        </div>
        <div class="detail-section">
            <div class="detail-label">Document ID</div>
            <div class="detail-value">${documentId}</div>
        </div>
        <div class="detail-section">
            <div class="detail-label">Source Editor</div>
            <div class="detail-value">${sourceEditor || 'Unknown'}</div>
        </div>
        <div class="detail-section">
            <div class="detail-label">Created</div>
            <div class="detail-value">${createdDate}</div>
        </div>
        <div class="detail-section">
            <div class="detail-label">Last Modified</div>
            <div class="detail-value">${modifiedDate}</div>
        </div>
        <div class="detail-actions">
            <button onclick="openDocument('${documentId}')">Open</button>
            <button onclick="deleteDocument('${documentId}')">Delete</button>
        </div>
    `;
    
    // Attach blur event to title input
    const titleInput = document.getElementById('document-title-input');
    if (titleInput) {
        titleInput.addEventListener('blur', () => {
            saveDocumentTitle(documentId, titleInput.value);
        });
    }
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

window.deleteDocument = function(documentId) {
    if (!state) return;
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    state.removeDocument(documentId);
    state.setMetadata('dateModified', new Date().toISOString());
    state.saveToLocalStorage();
    
    selectedDocumentId = null;
    updateStateDisplay();
    
    const detailElement = document.getElementById('documentDetail');
    if (detailElement) {
        detailElement.className = 'document-detail empty';
        detailElement.style.display = 'none';
    }
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
        loadProjects();
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
    if (!confirm('Are you sure? This will delete all your documents and create a new save.')) {
        return;
    }
    
    const now = new Date().toISOString();
    state = new GameplaySave();
    state.setMetadata('dateCreated', now);
    state.setMetadata('dateModified', now);
    state.saveToLocalStorage();
    
    selectedDocumentId = null;
    updateStateDisplay();
    
    // Reload projects to update progression
    loadProjects();
    
    const detailElement = document.getElementById('documentDetail');
    if (detailElement) {
        detailElement.style.display = 'none';
    }
    
    const saveStatusElement = document.getElementById('saveStatus');
    if (saveStatusElement) {
        saveStatusElement.textContent = 'New save created';
    }
    console.log('New save created:', state);
};

window.clearStorage = function() {
    if (!confirm('Are you sure? This will clear all localStorage data.')) {
        return;
    }
    
    localStorage.removeItem('gameplaySave');
    state = null;
    selectedDocumentId = null;
    
    const dateCreatedElement = document.getElementById('dateCreated');
    const dateModifiedElement = document.getElementById('dateModified');
    const saveStatusElement = document.getElementById('saveStatus');
    
    if (dateCreatedElement) {
        dateCreatedElement.textContent = 'Created: No save';
    }
    if (dateModifiedElement) {
        dateModifiedElement.textContent = 'Modified: No save';
    }
    if (saveStatusElement) {
        saveStatusElement.textContent = 'All data cleared';
    }
    if (document.getElementById('documentsList')) {
        document.getElementById('documentsList').innerHTML = '<p>No documents yet</p>';
    }
    if (document.getElementById('documentCount')) {
        document.getElementById('documentCount').textContent = '(0)';
    }
    
    // Reload projects to update progression
    loadProjects();
    
    const detailElement = document.getElementById('documentDetail');
    if (detailElement) {
        detailElement.className = 'document-detail empty';
        detailElement.style.display = 'none';
    }
    
    console.log('localStorage cleared');
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

// Load directions
Directions.fromFile('./directions.json').then(loadedDirections => {
    directions = loadedDirections;
    updateDirectionsDisplay();
}).catch(error => {
    console.error('Error loading directions:', error);
});

// Load from localStorage or create new save
if (GameplaySave.hasLocalStorage()) {
    state = GameplaySave.fromLocalStorage();
    updateStateDisplay();
} else {
    restartState();
}

initializeDetailView();
