// Landing page specific initialization
// Reuses state, drifts, and functions from drifts-helpers.js

import { GameplaySave } from '/editors/drifts/GameplaySave.js';
import { Drifts } from '/editors/drifts/Drifts.js';

let landingDrifts = null;

// Load and display drifts
async function loadDrifts() {
    try {
        landingDrifts = await Drifts.fromFile('/editors/drifts/drifts.json');
        displayDrifts();
    } catch (error) {
        console.error('Error loading drifts:', error);
    }
}

function displayDrifts() {
    if (!landingDrifts) return;
    
    const driftsOptions = document.getElementById('driftsOptions');
    const driftNames = landingDrifts.getDriftNames();
    
    if (driftNames.length === 0) {
        driftsOptions.innerHTML = '<p>No drifts available</p>';
        return;
    }
    
    driftsOptions.innerHTML = driftNames.map(driftName => {
        const drift = landingDrifts.getDrift(driftName);
        const displayName = drift.name || driftName;
        const description = drift.description || '';
        
        return `
            <div class="drift-option clickable" onclick="createNewGame('${driftName}')">
                <strong>${displayName}</strong>
                ${description ? `<div class="drift-desc">${description}</div>` : ''}
            </div>
        `;
    }).join('');
}

// Check and display existing save
function checkExistingSave() {
    if (GameplaySave.hasLocalStorage()) {
        const save = GameplaySave.fromLocalStorage();
        displaySaveInfo(save);
        document.getElementById('savesSection').style.display = 'block';
    }
}

function displaySaveInfo(save) {
    if (!save) return;
    
    const saveInfo = document.getElementById('saveInfo');
    const dateCreated = save.getMetadata('dateCreated');
    const dateModified = save.getMetadata('dateModified');
    const documentCount = save.getAllDocuments().length;
    const completedLevels = save.getMetadata('completedLevels') || [];
    
    const created = dateCreated ? new Date(dateCreated).toLocaleDateString() : 'Unknown';
    const modified = dateModified ? new Date(dateModified).toLocaleDateString() : 'Unknown';
    
    saveInfo.innerHTML = `
        <div class="save-info-item">Documents: ${documentCount}</div>
        <div class="save-info-item">Levels completed: ${completedLevels.length}</div>
        <div class="save-info-item">Created: ${created}</div>
        <div class="save-info-item">Last played: ${modified}</div>
    `;
}

// Show new game modal
window.showNewGameModal = function() {
    if (GameplaySave.hasLocalStorage()) {
        // Show warning modal if there's an existing save
        document.getElementById('new-game-warning-modal').style.display = 'flex';
    } else {
        // No existing save, go straight to drift selection
        document.getElementById('drift-selection-modal').style.display = 'flex';
    }
};

// Close warning modal
window.closeNewGameWarning = function() {
    document.getElementById('new-game-warning-modal').style.display = 'none';
};

// Proceed with backup
window.proceedWithBackup = function() {
    const save = GameplaySave.fromLocalStorage();
    save.setMetadata('dateModified', new Date().toISOString());
    save.downloadSave();
    
    // Close warning modal and show drift selection
    document.getElementById('new-game-warning-modal').style.display = 'none';
    document.getElementById('drift-selection-modal').style.display = 'flex';
};

// Proceed without backup
window.proceedWithoutBackup = function() {
    // Close warning modal and show drift selection
    document.getElementById('new-game-warning-modal').style.display = 'none';
    document.getElementById('drift-selection-modal').style.display = 'flex';
};

// Close drift selection modal
window.closeDriftSelection = function() {
    document.getElementById('drift-selection-modal').style.display = 'none';
};

// Create new game with selected drift
window.createNewGame = function(driftName) {
    const now = new Date().toISOString();
    const newSave = new GameplaySave();
    newSave.setMetadata('dateCreated', now);
    newSave.setMetadata('dateModified', now);
    newSave.setMetadata('selectedDrift', driftName);
    newSave.saveToLocalStorage();
    
    window.location.href = '/editors/drifts/drifts-menu.html';
};

// Continue existing game
window.continueGame = function() {
    if (!GameplaySave.hasLocalStorage()) return;
    window.location.href = '/editors/drifts/drifts-menu.html';
};

// Load save file - reuses GameplaySave.loadFromFile
window.loadSaveFile = function() {
    const fileInput = document.getElementById('fileInput');
    fileInput.click();
    // call continueGame
    window.continueGame();
};

document.getElementById('fileInput').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    try {
        const loadedSave = await GameplaySave.loadFromFile(file);
        loadedSave.setMetadata('dateModified', new Date().toISOString());
        loadedSave.saveToLocalStorage();
        
        displaySaveInfo(loadedSave);
        document.getElementById('savesSection').style.display = 'block';
        
        alert('Save file loaded successfully!');
    } catch (error) {
        alert(`Error loading save: ${error.message}`);
        console.error('Error loading save:', error);
    }
});

// Download save - reuses GameplaySave.downloadSave
window.downloadSave = function() {
    if (!GameplaySave.hasLocalStorage()) {
        alert('No save to download');
        return;
    }
    
    const save = GameplaySave.fromLocalStorage();
    save.setMetadata('dateModified', new Date().toISOString());
    save.downloadSave();
};

// About modal
window.showAbout = function() {
    document.getElementById('about-modal').style.display = 'flex';
};

window.closeAbout = function() {
    document.getElementById('about-modal').style.display = 'none';
};

// Initialize
loadDrifts();
checkExistingSave();
