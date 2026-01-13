let state = null;
let selectedDocumentId = null;

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
    
    detailElement.className = 'document-detail';
    detailElement.style.display = 'block';
    detailElement.innerHTML = `
        <div class="detail-section">
            <input type="text" id="document-title-input" value="${title}" >
        </div>
        <div class="content-section">
            <div class="document-content-preview">${content || '(empty)'}</div>
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

window.openDocument = function(documentId) {
    if (!state) return;
    
    const doc = state.getDocument(documentId);
    if (!doc) return;
    
    const sourceEditor = doc.getField('sourceEditor');
    
    // Map editor IDs to URLs
    const editorUrls = {
        'hyper-skip-3': '/editors/hyper-2-2/'
    };
    
    const editorUrl = editorUrls[sourceEditor];
    if (!editorUrl) {
        console.error('Unknown editor:', sourceEditor);
        return;
    }
    
    // Set as current document and navigate
    state.setMetadata('currentDocumentId', documentId);
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

// Load from localStorage or create new save
if (GameplaySave.hasLocalStorage()) {
    state = GameplaySave.fromLocalStorage();
    updateStateDisplay();
} else {
    restartState();
}

initializeDetailView();
