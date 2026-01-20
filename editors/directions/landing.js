import { ProjectsHelper } from './utils/projectsHelper.js';
import { GameplaySave } from './GameplaySave.js';
import { Document } from './Document.js';
import { Directions } from './Directions.js';

let state = null;
let selectedDocumentId = null;
let directions = null;

// Load projects on page load
async function loadProjects() {
    const visibleEditors = ['hyper-sense-4', 'poetris-beta', 'concrete-directions'];
    const allProjects = await ProjectsHelper.getVisibleProjects();
    console.log('allProjects', allProjects);
    const projects = allProjects.filter(p => visibleEditors.includes(p.url));
    const projectsList = document.getElementById('projects-list');
    
    if (projectsList) {
        projectsList.innerHTML = projects.map(project => 
            `<div class="project-nav"><a href="/editors/${project.url}/">${project.name}</a></div>`
        ).join('');
    }
}

// Initialize projects
loadProjects();

function updateDirectionsDisplay() {
    if (!directions) return;
    
    const directionsDisplay = document.getElementById('directionsDisplay');
    if (!directionsDisplay) return;
    
    directionsDisplay.innerHTML = directions.getDirectionNames().map(directionName => {
        const subdirections = directions.getSubdirections(directionName);
        
        return `<div style="margin-bottom: 20px;">
            <h3>${directionName}</h3>
            ${Object.entries(subdirections).map(([subName, subData]) => {
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
    
    document.getElementById('dateCreated').textContent = `Created: ${created}`;
    document.getElementById('dateModified').textContent = `Modified: ${modified}`;
    document.getElementById('saveStatus').textContent = 
        `${state.getAllDocuments().length} documents`;
    
    updateDocumentsList();
}

function updateDocumentsList() {
    const documentsListElement = document.getElementById('documentsList');
    const documentCountElement = document.getElementById('documentCount');
    if (!documentsListElement || !state) return;
    
    const documents = state.getAllDocuments();
    
    if (documentCountElement) {
        documentCountElement.textContent = `(${documents.length})`;
    }
    
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

function loadSaveState() {
    const fileInput = document.getElementById('fileInput');
    fileInput.click();
}

document.getElementById('fileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
        state = await GameplaySave.loadFromFile(file);
        state.setMetadata('dateModified', new Date().toISOString());
        updateStateDisplay();
        console.log('Save loaded:', state);
    } catch (error) {
        document.getElementById('saveStatus').textContent = 
            `Error loading save: ${error.message}`;
        console.error('Error loading save:', error);
    }
});

function restartState() {
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
    
    const detailElement = document.getElementById('documentDetail');
    if (detailElement) {
        detailElement.style.display = 'none';
    }
    
    console.log('New save created:', state);
}

function clearStorage() {
    if (!confirm('Are you sure? This will clear all localStorage data.')) {
        return;
    }
    
    localStorage.removeItem('gameplaySave');
    state = null;
    selectedDocumentId = null;
    
    document.getElementById('dateCreated').textContent = 'Created: No save';
    document.getElementById('dateModified').textContent = 'Modified: No save';
    document.getElementById('saveStatus').textContent = 'No save loaded';
    document.getElementById('documentsList').innerHTML = '<p>No documents yet</p>';
    document.getElementById('documentCount').textContent = '(0)';
    
    const detailElement = document.getElementById('documentDetail');
    if (detailElement) {
        detailElement.className = 'document-detail empty';
        detailElement.style.display = 'none';
    }
    
    console.log('localStorage cleared');
}

function saveState() {
    if (!state) {
        document.getElementById('saveStatus').textContent = 
            'No save to download. Create or load a save first.';
        return;
    }
    state.setMetadata('dateModified', new Date().toISOString());
    state.downloadSave();
    updateStateDisplay();
}

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
