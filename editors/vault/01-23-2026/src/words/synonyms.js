/**
 * Synonym lookup against the editors API.
 * 
 * It uses the 'proxy'-like setup in server.js which in turn creates local routes for the
 * server that is run by text/word_cache/word_cache.py - this file runs a server at 
 * http://127.0.0.1:3020 and run via docker (Dockerfile) as well as during `npm run servers`
 *
 * Three backends are available:
 *   'synonyms-wordnet'  — local WordNet via Node (supports POS)
 *   'synonyms-cache'    — pre-built SQLite cache via Python
 *   'synonyms-online'   — live wordhoard scraping via Python
 *
 * Quick usage:
 *   import { getSynonyms } from '.../synonyms.js';
 *   const { word, synonyms } = await getSynonyms('run');
 *
 * With options:
 *   await getSynonyms('run', { source: 'synonyms-cache', pos: 'verb' });
 *
 * Runtime switching (for UI dropdowns etc.):
 *   import { setSource, getSynonyms } from '.../synonyms.js';
 *   setSource('synonyms-online');
 */

const ENDPOINTS = {
  'synonyms-wordnet': window.BASE_PATH + '/api/synonyms-wordnet/synonyms',
  'synonyms-cache':   window.BASE_PATH + '/api/synonyms-cache/synonyms',
  'synonyms-online':  window.BASE_PATH + '/api/synonyms-online/synonyms',
};

let defaultSource = 'synonyms-online';

/**
 * Fetch synonyms for a word.
 *
 * @param {string} word
 * @param {Object} [opts]
 * @param {string} [opts.source]  Override the default backend for this call.
 * @param {string} [opts.pos]     Part of speech (noun/verb/adjective/adverb). Only synonyms-wordnet uses this.
 * @returns {Promise<{word: string, synonyms: string[]}>}
 */
export async function getSynonyms(word, { source, pos } = {}) {
  const src = source || defaultSource;
  const endpoint = ENDPOINTS[src];
  if (!endpoint) {
    throw new Error(`Unknown synonym source '${src}'. Valid: ${Object.keys(ENDPOINTS).join(', ')}`);
  }

  const { prefix, core, suffix } = stripPunctuation(word);

  let url = `${endpoint}?word=${encodeURIComponent(core)}`;
  if (pos) url += `&pos=${encodeURIComponent(pos)}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.error || !data.synonyms) {
    return { word, synonyms: [] };
  }

  const synonyms = data.synonyms.map(s => prefix + clean(s) + suffix);
  return { word, synonyms };
}

/** Change the default backend used when no `source` option is passed. */
export function setSource(source) {
  if (!ENDPOINTS[source]) {
    throw new Error(`Unknown synonym source '${source}'. Valid: ${Object.keys(ENDPOINTS).join(', ')}`);
  }
  defaultSource = source;
}

export function getSource() {
  return defaultSource;
}

// --- helpers ---

function stripPunctuation(word) {
  const match = word.match(/^([^\w]*)(.+?)([^\w]*)$/);
  if (!match) return { prefix: '', core: word, suffix: '' };
  return { prefix: match[1], core: match[2], suffix: match[3] };
}

/** Normalize raw strings from the synonym APIs. */
export function clean(synonym) {
  return synonym.replace('(a)', '').replaceAll('_', ' ');
}
