// Landing page specific initialization
// Reuses state, directions, and functions from directions-helpers.js

import { GameplaySave } from '/editors/directions/GameplaySave.js';
import { Directions } from '/editors/directions/Directions.js';

let landingDirections = null;

// Load and display directions
async function loadDirections() {
    try {
        landingDirections = await Directions.fromFile('/editors/directions/directions.json');
        displayDirections();
    } catch (error) {
        console.error('Error loading directions:', error);
    }
}

function displayDirections() {
    if (!landingDirections) return;
    
    const directionsOptions = document.getElementById('directionsOptions');
    const directionNames = landingDirections.getDirectionNames();
    
    if (directionNames.length === 0) {
        directionsOptions.innerHTML = '<p>No directions available</p>';
        return;
    }
    
    directionsOptions.innerHTML = directionNames.map(directionName => {
        const direction = landingDirections.getDirection(directionName);
        const displayName = direction.name || directionName;
        const description = direction.description || '';
        
        return `
            <div class="direction-option clickable" onclick="createNewGame('${directionName}')">
                <strong>${displayName}</strong>
                ${description ? `<div class="direction-desc">${description}</div>` : ''}
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
        // No existing save, go straight to direction selection
        document.getElementById('direction-selection-modal').style.display = 'flex';
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
    
    // Close warning modal and show direction selection
    document.getElementById('new-game-warning-modal').style.display = 'none';
    document.getElementById('direction-selection-modal').style.display = 'flex';
};

// Proceed without backup
window.proceedWithoutBackup = function() {
    // Close warning modal and show direction selection
    document.getElementById('new-game-warning-modal').style.display = 'none';
    document.getElementById('direction-selection-modal').style.display = 'flex';
};

// Close direction selection modal
window.closeDirectionSelection = function() {
    document.getElementById('direction-selection-modal').style.display = 'none';
};

// Create new game with selected direction
window.createNewGame = function(directionName) {
    const now = new Date().toISOString();
    const newSave = new GameplaySave();
    newSave.setMetadata('dateCreated', now);
    newSave.setMetadata('dateModified', now);
    newSave.setMetadata('selectedDirection', directionName);
    newSave.saveToLocalStorage();
    
    window.location.href = '/editors/directions/directions-menu.html';
};

// Continue existing game
window.continueGame = function() {
    if (!GameplaySave.hasLocalStorage()) return;
    window.location.href = '/editors/directions/directions-menu.html';
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
loadDirections();
checkExistingSave();
