// Admin + inspector for the current gameplay save.
// See ./SAVE_FORMAT.md for the save layout and the getText/putText API.
//
// Read views (metadata, documents grouped by drift -> level, drifts config,
// raw JSON) are field-driven and rendered through getText, so new fields/
// channels appear automatically. Write actions: unlock-all, delete document,
// clear save.

import { GameplaySave } from '/editors/drifts/GameplaySave.js';
import { Drifts } from '/editors/drifts/Drifts.js';
import { getText, joinText } from '/editors/drifts/ContentQuery.js';

let state = null;
let drifts = null;

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function fmt(value) {
  if (value == null) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function fmtDate(iso) {
  return iso ? new Date(iso).toLocaleString() : 'Unknown';
}

async function initialize() {
  if (GameplaySave.hasLocalStorage()) {
    try {
      state = GameplaySave.fromLocalStorage();
    } catch (err) {
      console.error('Admin: failed to read save', err);
      state = null;
    }
  }
  try {
    drifts = await Drifts.fromFile('drifts.json');
  } catch (err) {
    console.error('Admin: failed to load drifts.json', err);
  }
  await renderAdminView();
}

async function renderAdminView() {
  const adminContent = document.getElementById('adminContent');
  if (!adminContent) return;

  let html = '';
  html += renderUtilities();
  html += renderMetadata();
  if (state) html += await renderDocuments();
  html += renderLegacyEdits();
  html += renderDriftsData();
  html += renderRawJson();

  if (!state) {
    html += '<div class="admin-section"><p>No save found in localStorage.</p></div>';
  }

  adminContent.innerHTML = html;
}

function renderUtilities() {
  const allUnlocked = state?.getMetadata('allUnlocked') || false;
  const unlockBtn = state
    ? (allUnlocked
        ? '<button onclick="unlockAllLevels(false)" class="danger-btn">Un-Unlock All Levels</button>'
        : '<button onclick="unlockAllLevels(true)" class="danger-btn">Unlock All Levels</button>')
    : '';
  return `
    <div class="admin-section danger-zone">
      <h3>Utilities</h3>
      <button onclick="clearStorage()" class="danger-btn">Clear All Data</button>
      ${unlockBtn}
    </div>`;
}

// Generic: shows every metadata field, so new ones appear without edits here.
function renderMetadata() {
  if (!state) return '';
  const meta = state.metadata || {};
  const rows = Object.keys(meta).sort().filter(k => k !== 'edits').map(key => {
    let value = meta[key];
    if ((key === 'dateCreated' || key === 'dateModified') && value) {
      value = fmtDate(value);
    }
    return `
      <div class="metadata-item">
        <strong>${esc(key)}</strong>
        <div>${esc(fmt(value))}</div>
      </div>`;
  }).join('');
  return `
    <div class="admin-section">
      <h3>Save Metadata</h3>
      <div class="metadata-grid">${rows || '<div>(none)</div>'}</div>
    </div>`;
}

async function renderDocuments() {
  const documents = state.getAllDocuments();
  const chosen = state.getMetadata('chosenDocuments') || {};
  const selectedDrift = state.getMetadata('selectedDrift');

  let html = `
    <div class="admin-section">
      <h3>Documents</h3>
      <div><span class="stat-badge">${documents.length}</span> Total Documents</div>`;

  if (documents.length === 0) {
    return html + '<p style="color: var(--text-secondary); margin-top: 1rem;">No documents yet</p></div>';
  }

  // Group by drift -> level
  const byDrift = new Map();
  for (const doc of documents) {
    const dn = doc.getDriftName() || '(no drift)';
    if (!byDrift.has(dn)) byDrift.set(dn, []);
    byDrift.get(dn).push(doc);
  }

  for (const [dn, driftDocs] of byDrift) {
    const progression = (dn === selectedDrift && drifts?.getDrift(dn)?.progression) || [];
    html += `
      <div class="drift-card">
        <h4>${esc(dn)} <span style="font-weight:normal;color:var(--text-secondary);">(${driftDocs.length})</span></h4>`;

    const byLevel = new Map();
    for (const doc of driftDocs) {
      const lvl = doc.getLevelId() || '(no level)';
      if (!byLevel.has(lvl)) byLevel.set(lvl, []);
      byLevel.get(lvl).push(doc);
    }
    const orderedLevels = [
      ...progression.filter(l => byLevel.has(l)),
      ...[...byLevel.keys()].filter(l => !progression.includes(l)),
    ];

    for (const lvl of orderedLevels) {
      const chosenNote = chosen[lvl] ? ` · chosen → ${esc(chosen[lvl])}` : '';
      html += `<div class="level-detail"><strong>Level: ${esc(lvl)}${chosenNote}</strong>`;
      for (const doc of byLevel.get(lvl)) {
        html += await renderDocCard(doc, chosen[lvl] === doc.id, dn);
      }
      html += `</div>`;
    }
    html += `</div>`;
  }

  return html + '</div>';
}

// Field-driven: renders every key on the document. Known channels (content,
// edits) get nice formatting via getText; anything else is shown raw, so a
// new field shows up here even if no one updated this view.
async function renderDocCard(doc, isChosen, driftName) {
  const ctx = { driftName };
  const title = doc.getField('title') || 'Untitled';

  let body = '';
  for (const [key, value] of Object.entries(doc.getData())) {
    if (key === 'content') {
      const text = joinText(await getText(state, { scope: 'document', target: doc.id, type: 'content' }, ctx));
      let img = '';
      try {
        const parsed = JSON.parse(doc.getField('content'));
        if (parsed?.image) img = `<div class="document-image"><img src="${parsed.image}" alt="preview" /></div>`;
      } catch { /* not JSON */ }
      body += `<div><strong>content:</strong></div>${img}<pre>${esc(text) || '(empty)'}</pre>`;
    } else if (key === 'edits') {
      const edits = await getText(state, { scope: 'document', target: doc.id, type: 'edits' }, ctx);
      const list = edits.length ? esc(edits.map(e => e.text).join(', ')) : '(none)';
      body += `<div><strong>edits (${edits.length}):</strong> ${list}</div>`;
    } else {
      const shown = (key === 'createdAt' || key === 'lastModified') ? fmtDate(value) : fmt(value);
      body += `<div><strong>${esc(key)}:</strong> ${esc(shown)}</div>`;
    }
  }

  return `
    <div class="admin-document">
      <details>
        <summary>
          <strong>${esc(title)}</strong>
          <span style="color: var(--text-secondary); font-weight: normal; margin-left: 1rem;">
            ${esc(doc.id)}${isChosen ? ' · ★ chosen' : ''}
          </span>
        </summary>
        <div class="document-content">
          ${body}
          <button onclick="deleteDocument('${doc.id}')">Delete Document</button>
        </div>
      </details>
    </div>`;
}

// Legacy pre-v2 edits live in metadata; new edits are per-document.
function renderLegacyEdits() {
  if (!state) return '';
  const edits = state.getMetadata('edits') || [];
  if (!edits.length) return '';
  const items = edits.map((e) => `[${esc(e.driftName || '?')}] ${esc(e.text)}`).join('\n');
  return `
    <div class="admin-section">
      <h3>Legacy metadata.edits <span class="stat-badge">${edits.length}</span></h3>
      <p style="color: var(--text-secondary);">Pre-v2 edits, not migrated to documents.</p>
      <pre>${items}</pre>
    </div>`;
}

function renderDriftsData() {
  if (!drifts) return '';
  const driftNames = drifts.getDriftNames();
  let html = `
    <div class="admin-section">
      <h3>Drifts Config</h3>
      <div><span class="stat-badge">${driftNames.length}</span> Total Drifts</div>`;

  driftNames.forEach(driftName => {
    const drift = drifts.getDrift(driftName);
    const levels = drifts.getLevels(driftName);
    html += `
      <div class="drift-card">
        <h4>${esc(driftName)}</h4>
        <div><strong>Display Name:</strong> ${esc(drift.name || 'N/A')}</div>
        <div><strong>Progression:</strong> ${drift.progression ? esc(drift.progression.join(' → ')) : 'N/A'}</div>
        <div><strong>Levels:</strong> ${levels.length}</div>
        <details style="margin-top: 1rem;">
          <summary>View Level Details</summary>
          <div style="padding-left: 1rem; padding-top: 1rem;">
            ${levels.map(level => `
              <div class="level-detail">
                <strong>${esc(level.name)}</strong>
                <div><strong>Editor:</strong> ${esc(level.editor || 'N/A')}</div>
                <div><strong>Prompt:</strong> ${esc(fmt(level.prompt))}</div>
                ${level['initialState'] ? `<details style="margin-top:0.5rem;"><summary>Initial State</summary><pre>${esc(JSON.stringify(level['initialState'], null, 2))}</pre></details>` : ''}
              </div>`).join('')}
          </div>
        </details>
      </div>`;
  });

  return html + '</div>';
}

function renderRawJson() {
  if (!state) return '';
  return `
    <div class="admin-section">
      <h3>Raw Save JSON</h3>
      <details><summary>Show</summary><pre>${esc(state.write())}</pre></details>
    </div>`;
}

// --- actions ---------------------------------------------------------------

window.clearStorage = function () {
  if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
    localStorage.clear();
    alert('All data cleared. Redirecting to main page...');
    window.location.href = 'drifts-menu.html';
  }
};

window.unlockAllLevels = function (unlock = true) {
  if (!state) return;
  state.setMetadata('allUnlocked', unlock);
  state.saveToLocalStorage();
  renderAdminView();
};

window.deleteDocument = function (documentId) {
  if (!state) return;
  if (confirm('Are you sure you want to delete this document?')) {
    state.removeDocument(documentId);
    state.setMetadata('dateModified', new Date().toISOString());
    state.saveToLocalStorage();
    renderAdminView();
  }
};

initialize();
