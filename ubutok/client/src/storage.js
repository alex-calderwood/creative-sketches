// All user data lives in the browser's localStorage.
// Nothing here is ever sent to the server.

const KEYS = {
  history: 'ubutok_history',
  enabledCategories: 'ubutok_enabled_categories',
};

const MAX_HISTORY = 100;

export function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.history) || '[]');
  } catch {
    return [];
  }
}

export function addToHistory(item) {
  const history = getHistory();
  const entry = {
    id: item.id,
    type: item.type,
    title: item.title,
    category: item.category,
    categoryLabel: item.categoryLabel,
    sourceUrl: item.sourceUrl,
    seenAt: new Date().toISOString(),
  };
  // Deduplicate by sourceUrl, keep most recent
  const deduped = [entry, ...history.filter(h => h.sourceUrl !== item.sourceUrl)];
  localStorage.setItem(KEYS.history, JSON.stringify(deduped.slice(0, MAX_HISTORY)));
}

export function clearHistory() {
  localStorage.removeItem(KEYS.history);
}

export function getEnabledCategories() {
  try {
    const stored = localStorage.getItem(KEYS.enabledCategories);
    return stored ? JSON.parse(stored) : null; // null = all enabled
  } catch {
    return null;
  }
}

export function setEnabledCategories(keys) {
  localStorage.setItem(KEYS.enabledCategories, JSON.stringify(keys));
}
