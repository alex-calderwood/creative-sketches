import { GameplaySave } from '/editors/drifts/GameplaySave.js';
import { Drifts } from '/editors/drifts/Drifts.js';

let state = null;
let drifts = null;

/**
 * Initialize admin view
 */
async function initialize() {
    try {
        // Load state from localStorage
        state = new GameplaySave();
        await state.loadFromLocalStorage();
        
        // Load drifts
        drifts = await Drifts.fromFile('drifts.json');
        
        renderAdminView();
    } catch (error) {
        console.error('Error initializing admin view:', error);
    }
}

/**
 * Render admin view
 */
function renderAdminView() {
    const adminContent = document.getElementById('adminContent');
    if (!adminContent) return;
    
    let html = '';

    const allUnlocked = state?.getMetadata('allUnlocked') || false;
    
    // Utilities
    html += `
        <div class="admin-section danger-zone">
            <h3>Utilities</h3>
            <button onclick="clearStorage()" class="danger-btn">Clear All Data</button>
            ${allUnlocked ? '<button onclick="unlockAllLevels(false)" class="danger-btn">Un-Unlock All Levels</button>' : '<button onclick="unlockAllLevels(true)" class="danger-btn">Unlock All Levels</button>'}
        </div>
    `;
    
    // Save Metadata
    if (state) {
        const dateCreated = state.getMetadata('dateCreated');
        const dateModified = state.getMetadata('dateModified');
        const selectedDrift = state.getMetadata('selectedDrift');
        const completedLevels = state.getMetadata('completedLevels') || [];
        
        html += `
            <div class="admin-section">
                <h3>Save Metadata</h3>
                <div class="metadata-grid">
                    <div class="metadata-item">
                        <strong>Date Created</strong>
                        <div>${dateCreated ? new Date(dateCreated).toLocaleString() : 'Unknown'}</div>
                    </div>
                    <div class="metadata-item">
                        <strong>Date Modified</strong>
                        <div>${dateModified ? new Date(dateModified).toLocaleString() : 'Unknown'}</div>
                    </div>
                    <div class="metadata-item">
                        <strong>Selected Drift</strong>
                        <div>${selectedDrift || 'None'}</div>
                    </div>
                    <div class="metadata-item">
                        <strong>Completed Levels</strong>
                        <div>${completedLevels.length > 0 ? completedLevels.join(', ') : 'None'}</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // Edits
    if (state) {
        const edits = state.getMetadata('edits') || [];
        
        html += `
            <div class="admin-section">
                <h3>Edits</h3>
                <div><span class="stat-badge">${edits.length}</span> Total Edits</div>
        `;
        
        if (edits.length === 0) {
            html += '<p style="color: var(--text-secondary); margin-top: 1rem;">No edits yet</p>';
        } else {
            edits.forEach((edit, index) => {
                html += `
                    <div class="admin-document">
                        <details>
                            <summary>
                                <strong>Edit #${index + 1}</strong>
                            </summary>
                            <div class="document-content">
                                ${Object.entries(edit).map(([key, value]) => {
                                    const displayValue = typeof value === 'object' 
                                        ? `<pre>${JSON.stringify(value, null, 2)}</pre>` 
                                        : value;
                                    return `<div><strong>${key}:</strong> ${displayValue}</div>`;
                                }).join('')}
                            </div>
                        </details>
                    </div>
                `;
            });
        }
        
        html += '</div>';
    }
    
    // Drifts Data
    if (drifts) {
        const driftNames = drifts.getDriftNames();
        
        html += `
            <div class="admin-section">
                <h3>Drifts Data</h3>
                <div><span class="stat-badge">${driftNames.length}</span> Total Drifts</div>
        `;
        
        driftNames.forEach(dirName => {
            const drift = drifts.getDrift(dirName);
            const levels = drifts.getLevels(dirName);
            
            html += `
                <div class="drift-card">
                    <h4>${dirName}</h4>
                    <div><strong>Display Name:</strong> ${drift.name || 'N/A'}</div>
                    <div><strong>Progression:</strong> ${drift.progression ? drift.progression.join(' → ') : 'N/A'}</div>
                    <div><strong>Levels:</strong> ${levels.length}</div>
                    <details style="margin-top: 1rem;">
                        <summary>View Level Details</summary>
                        <div style="padding-left: 1rem; padding-top: 1rem;">
                            ${levels.map(level => {
                                return `
                                    <div class="level-detail">
                                        <strong>${level.name}</strong>
                                        <div style="margin-top: 0.5rem;"><strong>Name:</strong> ${level.name || 'N/A'}</div>
                                        <div><strong>Editor:</strong> ${level.editor || 'N/A'}</div>
                                        <div><strong>Prompt:</strong> ${level.prompt || 'N/A'}</div>
                                        ${level['initial-state'] ? `<details style="margin-top: 0.5rem;"><summary>Initial State</summary><pre>${JSON.stringify(level['initial-state'], null, 2)}</pre></details>` : ''}
                                        ${level.replacements ? `<details style="margin-top: 0.5rem;"><summary>Replacements</summary><pre>${JSON.stringify(level.replacements, null, 2)}</pre></details>` : ''}
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </details>
                </div>
            `;
        });
        
        html += '</div>';
    }
    
    // All Documents
    if (state) {
        const documents = state.getAllDocuments();
        html += `
            <div class="admin-section">
                <h3>All Documents</h3>
                <div><span class="stat-badge">${documents.length}</span> Total Documents</div>
        `;
        
        if (documents.length === 0) {
            html += '<p style="color: var(--text-secondary); margin-top: 1rem;">No documents yet</p>';
        } else {
            // Sort by most recent
            documents.sort((a, b) => {
                const aTime = a.getField('lastModified') || a.getField('createdAt') || '';
                const bTime = b.getField('lastModified') || b.getField('createdAt') || '';
                return new Date(bTime) - new Date(aTime);
            });
            
            documents.forEach(doc => {
                const title = doc.getField('title') || 'Untitled';
                const sourceEditor = doc.getField('sourceEditor');
                const createdAt = doc.getField('createdAt');
                const lastModified = doc.getField('lastModified');
                const content = doc.getField('content') || '';
                
                // Parse content to extract image and text
                let imageHtml = '';
                let textContent = '';
                try {
                    const parsedContent = JSON.parse(content);
                    if (parsedContent.image) {
                        imageHtml = `
                            <div class="document-image">
                                <img src="${parsedContent.image}" alt="Document preview" />
                            </div>
                        `;
                    }
                    if (parsedContent.text) {
                        textContent = parsedContent.text;
                    } else {
                        textContent = content;
                    }
                } catch (e) {
                    textContent = content;
                }
                
                html += `
                    <div class="admin-document">
                        <details>
                            <summary>
                                <strong>${title}</strong> 
                                <span style="color: var(--text-secondary); font-weight: normal; margin-left: 1rem;">
                                    ${sourceEditor || 'Unknown'} · ${lastModified ? new Date(lastModified).toLocaleDateString() : 'Unknown'}
                                </span>
                            </summary>
                            <div class="document-content">
                                <div><strong>ID:</strong> ${doc.id}</div>
                                <div><strong>Source Editor:</strong> ${sourceEditor || 'Unknown'}</div>
                                <div><strong>Created:</strong> ${createdAt ? new Date(createdAt).toLocaleString() : 'Unknown'}</div>
                                <div><strong>Modified:</strong> ${lastModified ? new Date(lastModified).toLocaleString() : 'Unknown'}</div>
                                ${imageHtml}
                                ${textContent ? `
                                    <div style="margin-top: 1.5rem;">
                                        <strong>Text Content:</strong>
                                        <pre>${textContent}</pre>
                                    </div>
                                ` : '<div style="color: var(--text-secondary); margin-top: 1rem;">(empty)</div>'}
                                <button onclick="deleteDocument('${doc.id}')">Delete Document</button>
                            </div>
                        </details>
                    </div>
                `;
            });
        }
        
        html += '</div>';
    }
    
    adminContent.innerHTML = html;
}

/**
 * Clear all data from localStorage
 */
window.clearStorage = function() {
    if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
        localStorage.clear();
        alert('All data cleared. Redirecting to main page...');
        window.location.href = 'drifts-menu.html';
    }
};

/**
 * Unlock all levels
 */
window.unlockAllLevels = function(unlock=true) {
    state.setMetadata('allUnlocked', unlock);
    state.saveToLocalStorage();
    renderAdminView();
};

/**
 * Delete a specific document
 */
window.deleteDocument = function(documentId) {
    if (!state) return;
    
    if (confirm('Are you sure you want to delete this document?')) {
        state.deleteDocument(documentId);
        state.setMetadata('dateModified', new Date().toISOString());
        state.saveToLocalStorage();
        renderAdminView();
    }
};

// Start initialization
initialize();
