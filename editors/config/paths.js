/**
 * Single source of truth for the app's URL prefixes.
 *
 * The reverse proxy (Nginx Proxy Manager custom locations) stays "dumb": each
 * location just forwards to :3008 without stripping the path or setting headers.
 * The app therefore receives the FULL public path and figures out its own prefix
 * here. To relocate the site you change CANONICAL_BASE below and add the previous
 * name to LEGACY_BASES — then add a matching custom location in the proxy UI.
 * Nothing else in the codebase hardcodes the public path.
 *
 *   - CANONICAL_BASE : the live public prefix. Everything is served under it and
 *                      all legacy prefixes 301-redirect to it.
 *   - LEGACY_BASES   : old public prefixes that should permanently redirect to
 *                      CANONICAL_BASE (preserving the rest of the path).
 *   - INTERNAL_BASE  : the prefix the source code + static assets are written
 *                      against. Stable and decoupled from the public name; the
 *                      app rewrites incoming canonical requests down to this so
 *                      the existing routes keep matching, and rewrites it back
 *                      out to the public base in served HTML / the import map.
 */

const INTERNAL_BASE = '/editors';
const CANONICAL_BASE = '/writers-project';
const LEGACY_BASES = ['/editors'];

// Every public prefix the app should recognize on an incoming request.
const KNOWN_BASES = [CANONICAL_BASE, ...LEGACY_BASES];

/** True if `path` is exactly `prefix` or sits underneath it. */
function underPrefix(path, prefix) {
  return path === prefix || path.startsWith(prefix + '/');
}

/**
 * Classify an incoming request path against the known prefixes.
 * Returns { prefix, isLegacy } or null if no known prefix matches.
 */
function matchBase(path) {
  if (underPrefix(path, CANONICAL_BASE)) {
    return { prefix: CANONICAL_BASE, isLegacy: false };
  }
  for (const legacy of LEGACY_BASES) {
    if (underPrefix(path, legacy)) return { prefix: legacy, isLegacy: true };
  }
  return null;
}

module.exports = {
  INTERNAL_BASE,
  CANONICAL_BASE,
  LEGACY_BASES,
  KNOWN_BASES,
  underPrefix,
  matchBase,
};
