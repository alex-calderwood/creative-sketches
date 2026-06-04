const USER_COLORS = ['#e8a248', '#72b585', '#c07060', '#7092c0'];
const CSS_VARS    = ['--user-0', '--user-1', '--user-2', '--user-3'];
const MAX_USERS = 4;

// ─── Init ─────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  addUserRow();
  addUserRow();

  document.getElementById('addUser').addEventListener('click', () => {
    if (rowCount() < MAX_USERS) addUserRow();
  });

  document.getElementById('compareBtn').addEventListener('click', runCompare);
});

// ─── Row management ───────────────────────────────────────────

function rowCount() {
  return document.querySelectorAll('.user-row').length;
}

function addUserRow() {
  const container = document.getElementById('userInputs');
  const idx = rowCount();
  if (idx >= MAX_USERS) return;

  const row = document.createElement('div');
  row.className = 'user-row';

  const dot = document.createElement('div');
  dot.className = 'user-row-dot';
  dot.style.background = USER_COLORS[idx];

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'user-row-input';
  input.placeholder = `Letterboxd username ${idx + 1}`;
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.addEventListener('keydown', e => { if (e.key === 'Enter') runCompare(); });
  input.addEventListener('input', () => input.classList.remove('has-error'));

  const remove = document.createElement('button');
  remove.className = 'user-row-remove';
  remove.type = 'button';
  remove.setAttribute('aria-label', 'Remove user');
  remove.textContent = '×';
  remove.addEventListener('click', () => {
    row.remove();
    reindex();
    syncUI();
  });

  row.append(dot, input, remove);
  container.appendChild(row);

  syncUI();
  if (idx > 0) input.focus();
}

function reindex() {
  document.querySelectorAll('.user-row').forEach((row, i) => {
    row.querySelector('.user-row-dot').style.background = USER_COLORS[i];
    row.querySelector('.user-row-input').placeholder = `Letterboxd username ${i + 1}`;
  });
}

function syncUI() {
  const n = rowCount();
  document.getElementById('addUser').disabled = n >= MAX_USERS;

  document.querySelectorAll('.user-row-remove').forEach((btn, i) => {
    btn.style.visibility = n <= 2 ? 'hidden' : 'visible';
  });
}

function getInputRows() {
  return Array.from(document.querySelectorAll('.user-row'));
}

function getUsernames() {
  return getInputRows().map(r => r.querySelector('.user-row-input').value.trim()).filter(Boolean);
}

// ─── Compare ──────────────────────────────────────────────────

async function runCompare() {
  const usernames = getUsernames();
  if (usernames.length < 2) {
    setResults(errorHTML('Enter at least two usernames to compare.'));
    return;
  }

  const btn = document.getElementById('compareBtn');
  btn.disabled = true;
  setResults(loadingHTML(usernames));

  try {
    const res = await fetch('/api/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernames }),
    });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Comparison failed');

    renderResults(data);
  } catch (err) {
    setResults(errorHTML(esc(err.message)));
  } finally {
    btn.disabled = false;
  }
}

// ─── Render ───────────────────────────────────────────────────

function renderResults(data) {
  const { usernames, users, overlap, partial, unique } = data;

  const statsHTML = buildStats(usernames, users, overlap, partial);
  const overlapHTML = buildOverlapSection(overlap);
  const partialHTML = buildPartialSection(partial, usernames);
  const uniqueHTML = buildUniqueSection(unique, usernames);

  setResults(statsHTML + overlapHTML + partialHTML + uniqueHTML);
}

function buildStats(usernames, users, overlap, partial) {
  const userStats = users.map((u, i) => `
    <div class="stat">
      <span class="stat-num" style="color:${USER_COLORS[i]}">${u.count}</span>
      <span class="stat-label">${esc(u.username)}</span>
    </div>
  `).join('<div class="stat-divider"></div>');

  return `
    <div class="stats-bar">
      <div class="stat is-overlap">
        <span class="stat-num">${overlap.length}</span>
        <span class="stat-label">In common</span>
      </div>
      <div class="stat-divider"></div>
      <div class="stat">
        <span class="stat-num" style="color:var(--color-ochre)">${partial.length}</span>
        <span class="stat-label">Partial overlap</span>
      </div>
      <div class="stat-divider"></div>
      ${userStats}
    </div>
  `;
}

function buildOverlapSection(overlap) {
  if (!overlap.length) return `
    <div class="result-section">
      <div class="section-head">
        <span class="section-title">IN COMMON</span>
        <span class="section-sub">no films shared by everyone</span>
        <div class="section-rule green"></div>
      </div>
    </div>
  `;

  const cards = overlap
    .map((f, i) => filmCard(f, { badge: true, delay: i * 35 }))
    .join('');

  return `
    <div class="result-section">
      <div class="section-head">
        <span class="section-title">IN COMMON</span>
        <span class="section-sub">${overlap.length} ${plural(overlap.length, 'film')} everyone wants to see</span>
        <div class="section-rule green"></div>
      </div>
      <div class="film-grid lg">${cards}</div>
    </div>
  `;
}

function buildPartialSection(partial, usernames) {
  if (!partial.length) return '';

  const cards = partial
    .map((f, i) => filmCard(f, { dots: f.sharedBy, usernames, delay: i * 25 }))
    .join('');

  return `
    <div class="result-section">
      <div class="section-head">
        <span class="section-title">ALSO SHARED</span>
        <span class="section-sub">${partial.length} ${plural(partial.length, 'film')} on some lists</span>
        <div class="section-rule ochre"></div>
      </div>
      <div class="film-grid">${cards}</div>
    </div>
  `;
}

function buildUniqueSection(unique, usernames) {
  const cols = usernames.map((username, i) => {
    const films = unique[i] || [];
    const shown = films.slice(0, 18);
    const more = films.length - shown.length;

    const cards = shown.length
      ? `<div class="film-grid">${shown.map((f, j) => filmCard(f, { delay: j * 20 })).join('')}</div>
         ${more > 0 ? `<p class="no-unique" style="margin-top:0.75rem">+ ${more} more</p>` : ''}`
      : `<p class="no-unique">Every film overlaps with another list.</p>`;

    return `
      <div class="user-col">
        <div class="user-col-head">
          <div class="user-col-dot" style="background:${USER_COLORS[i]}"></div>
          <span class="user-col-name">${esc(username).toUpperCase()}</span>
          <span class="user-col-count">${films.length} unique</span>
        </div>
        ${cards}
      </div>
    `;
  }).join('');

  return `
    <div class="result-section">
      <div class="section-head">
        <span class="section-title">ONLY ON THEIR LIST</span>
        <span class="section-sub">films no one else is waiting on</span>
        <div class="section-rule faint"></div>
      </div>
      <div class="user-cols">${cols}</div>
    </div>
  `;
}

// ─── Film card ────────────────────────────────────────────────

function filmCard(film, { badge = false, dots = null, usernames = [], delay = 0 } = {}) {
  const href = film.link || '#';
  const target = film.link ? 'target="_blank" rel="noopener noreferrer"' : '';

  const posterContent = film.poster
    ? `<img src="${esc(film.poster)}" alt="${esc(film.title)}" loading="lazy">`
    : `<div class="film-no-poster"><span>${esc(film.title)}</span></div>`;

  const badgeHTML = badge ? '<div class="film-badge"></div>' : '';

  const dotsHTML = dots
    ? `<div class="film-dots">
        ${dots.map(u => {
          const idx = usernames.indexOf(u);
          const color = idx >= 0 ? USER_COLORS[idx] : '#888';
          return `<div class="film-dot" style="background:${color}" title="${esc(u)}"></div>`;
        }).join('')}
      </div>`
    : '';

  return `
    <a class="film-card" href="${esc(href)}" ${target} style="animation-delay:${delay}ms">
      <div class="film-poster">
        ${posterContent}
        ${badgeHTML}
      </div>
      <div class="film-meta">
        <div class="film-title">${esc(film.title)}</div>
        ${film.year ? `<div class="film-year">${esc(String(film.year))}</div>` : ''}
        ${dotsHTML}
      </div>
    </a>
  `;
}

// ─── Helpers ──────────────────────────────────────────────────

function setResults(html) {
  document.getElementById('results').innerHTML = html;
}

function loadingHTML(usernames) {
  const names = usernames.map(u => `<em>${esc(u)}</em>`).join(', ');
  return `
    <div class="loading-wrap">
      <div class="loading-reel">
        <div class="loading-frame"></div>
        <div class="loading-frame"></div>
        <div class="loading-frame"></div>
        <div class="loading-frame"></div>
        <div class="loading-frame"></div>
        <div class="loading-frame"></div>
      </div>
      <p class="loading-text">Fetching watchlists for ${names}…</p>
    </div>
  `;
}

function errorHTML(msg) {
  return `<div class="error-banner">${msg}</div>`;
}

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function plural(n, word) {
  return n === 1 ? word : word + 's';
}
