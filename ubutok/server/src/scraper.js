import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import { CATEGORIES } from './categories.js';

const cache = new Map();

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

async function fetchHtml(url) {
  if (cache.has(url)) return cache.get(url);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UbuTok/1.0)' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  const html = await res.text();
  cache.set(url, html);
  return html;
}

function resolveUrl(href, base) {
  if (!href) return null;
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
}

function extractPageLinks(html, base) {
  const $ = cheerio.load(html);
  const rootIndex = base.endsWith('/') ? base + 'index.html' : base + '/index.html';
  const links = new Set();
  $('a[href$=".html"]').each((_, el) => {
    const href = $(el).attr('href');
    const url = resolveUrl(href, base);
    if (url && url.startsWith(base) && url !== rootIndex) {
      links.add(url);
    }
  });
  return [...links];
}

function cleanTitle(raw) {
  // Normalize spaced letters: "U B U W E B" → "UbuWeb"
  const s = raw.trim().replace(/U\s+B\s+U\s+W\s+E\s+B/gi, 'UbuWeb');
  if (!s.toLowerCase().startsWith('ubuweb')) return s;
  const colonIdx = s.indexOf(': ');
  if (colonIdx !== -1) return s.slice(colonIdx + 2).trim();
  const dashIdx = s.indexOf(' - ');
  if (dashIdx !== -1) return s.slice(dashIdx + 3).trim();
  return s.replace(/^ubuweb\S*\s*/i, '').trim();
}

function preserveLineBreaks($) {
  $('br').replaceWith('\n');
  $('p, h1, h2, h3, h4, h5, h6, li, dt, dd, blockquote').each((_, el) => {
    $(el).prepend('\n\n');
  });
}

function normalizeWhitespace(text) {
  return text
    .replace(/[ \t]+/g, ' ')       // collapse horizontal whitespace
    .replace(/\n{3,}/g, '\n\n')    // max two consecutive newlines
    .trim();
}

function absolutifyLinks($el, sourceUrl, $) {
  $el.find('a[href]').each((_, a) => {
    const href = $(a).attr('href');
    if (!href || href.startsWith('javascript:') || href === '#') {
      $(a).replaceWith($(a).html() || '');
      return;
    }
    const abs = resolveUrl(href, sourceUrl);
    if (abs === sourceUrl) {
      // Self-referential link — strip the anchor, keep text
      $(a).replaceWith($(a).text() || '');
      return;
    }
    if (abs) {
      $(a).attr('href', abs);
      $(a).attr('target', '_blank');
      $(a).attr('rel', 'noopener noreferrer');
    }
  });
}

function extractDescription($, sourceUrl) {
  // Newer film pages use #ubudesc
  const ubudesc = $('#ubudesc');
  if (ubudesc.length && ubudesc.text().trim().length > 80) {
    ubudesc.find('script, style, img').remove();
    absolutifyLinks(ubudesc, sourceUrl, $);
    return (ubudesc.html() || '').trim().slice(0, 5000);
  }

  // Older pages: pick the td with the most text
  let bestEl = null, bestLen = 0;
  $('td').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > bestLen) { bestLen = text.length; bestEl = el; }
  });
  if (!bestEl || bestLen < 80) return '';

  const $el = $(bestEl);
  $el.find('script, style, img, form').remove();
  absolutifyLinks($el, sourceUrl, $);
  return ($el.html() || '').trim().slice(0, 5000);
}

function extractVideo($, sourceUrl) {
  const videoSrc = $('video source').first().attr('src')
    || $('source[src*=".m3u8"]').first().attr('src')
    || $('source[src*=".mp4"]').first().attr('src');

  if (!videoSrc) return null;

  const mp4Link = $('a#moviename').attr('href');
  const mp4Url = mp4Link ? resolveUrl(mp4Link, 'https://ubuweb.com') : null;

  return {
    type: 'video',
    title: cleanTitle($('title').text()),
    description: extractDescription($, sourceUrl),
    mediaUrl: videoSrc.startsWith('http') ? videoSrc : 'https://ubuweb.com' + videoSrc,
    mp4Url,
    sourceUrl,
  };
}

function extractAudioDescription($, sourceUrl) {
  // Find element containing NOTES section if present
  let notesEl = null;
  $('td, div').each((_, el) => {
    if (/\bNOTES\b/.test($(el).text())) { notesEl = el; return false; }
  });
  if (notesEl) {
    const $el = $(notesEl);
    $el.find('script, style, img').remove();
    absolutifyLinks($el, sourceUrl, $);
    return ($el.html() || '').trim().slice(0, 5000);
  }
  return extractDescription($, sourceUrl);
}

function extractAudio($, sourceUrl) {
  const mp3Links = [];
  $('a[href$=".mp3"]').each((_, el) => {
    const href = $(el).attr('href');
    const url = resolveUrl(href, sourceUrl);
    const label = $(el).text().trim();
    if (url && label) mp3Links.push({ url, label });
  });

  if (mp3Links.length === 0) return null;

  const track = randomFrom(mp3Links);

  return {
    type: 'audio',
    title: cleanTitle($('title').text()),
    trackTitle: track.label,
    description: extractAudioDescription($, sourceUrl),
    mediaUrl: track.url,
    sourceUrl,
  };
}

function extractPdf($, sourceUrl) {
  const links = [];
  $('a[href$=".pdf"]').each((_, el) => {
    const href = $(el).attr('href');
    const url = resolveUrl(href, sourceUrl);
    const label = $(el).text().trim();
    if (url) links.push({ url, label });
  });
  if (links.length === 0) return null;

  const pdf = randomFrom(links);
  return {
    type: 'pdf',
    title: cleanTitle($('title').text()),
    description: extractDescription($, sourceUrl),
    pdfUrl: pdf.url,
    pdfLabel: pdf.label,
    allPdfs: links.map(l => ({ url: l.url, label: l.label })),
    sourceUrl,
  };
}

function extractText($, sourceUrl) {
  preserveLineBreaks($);

  // Remove nav/footer noise
  $('script, style, form, [class*="nav"], [id*="nav"]').remove();

  // Pick the td or div with the most text — the main content column
  let bestEl = null;
  let bestLen = 0;
  $('td, div').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > bestLen) { bestLen = text.length; bestEl = el; }
  });

  if (bestLen < 100) return null;

  const raw = $(bestEl).text();
  const text = normalizeWhitespace(raw)
    .replace(/U\s+B\s+U\s+W\s+E\s+B\s*(?:::[^\n]*)?\n*/gi, '')
    .trim()
    .slice(0, 8000);

  return {
    type: 'text',
    title: cleanTitle($('title').text()),
    text,
    sourceUrl,
  };
}

const IMAGE_SKIP = /arrow|header|title|logo|bullet|_red|_black|trans|nav|icon|bg_|background/i;

function extractImage($, sourceUrl) {
  const imgs = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src');
    if (!src || IMAGE_SKIP.test(src)) return;
    // Skip tiny nav images
    const w = parseInt($(el).attr('width') || '0');
    const h = parseInt($(el).attr('height') || '0');
    if ((w > 0 && w < 60) || (h > 0 && h < 60)) return;
    const url = resolveUrl(src, sourceUrl);
    if (url) imgs.push({ url, area: w * h });
  });
  if (imgs.length === 0) return null;
  // Prefer larger images
  imgs.sort((a, b) => b.area - a.area);
  return {
    type: 'image',
    title: cleanTitle($('title').text()),
    description: extractDescription($, sourceUrl),
    mediaUrl: imgs[0].url,
    allImages: imgs.slice(0, 12).map(i => i.url),
    sourceUrl,
  };
}

async function tryExtractMedia(url, mediaType) {
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    if (mediaType === 'video') return extractVideo($, url);
    if (mediaType === 'audio') return extractAudio($, url);
    if (mediaType === 'image') return extractImage($, url);
    if (mediaType === 'text')  return extractPdf($, url) || extractText($, url);
    if (mediaType === 'pdf')   return extractPdf($, url);
    // 'rich': auto-detect but skip text/image — used for index pages
    if (mediaType === 'rich')  return extractVideo($, url) || extractAudio($, url) || extractPdf($, url);
    // null: full auto-detect
    return extractVideo($, url) || extractAudio($, url) || extractPdf($, url) || extractImage($, url) || extractText($, url);
  } catch (err) {
    dbg(`  fetch failed for ${url}: ${err.message}`);
    return null;
  }
}

const DEBUG = process.env.DEBUG === 'true';

function dbg(...args) {
  if (DEBUG) console.log('[scraper]', ...args);
}

async function fetchFromCategory(category) {
  const { base, index, mediaType, key, label } = category;
  const tried = [];

  dbg(`[${key}] fetching index ${index}`);
  const indexHtml = await fetchHtml(index);
  const artistPages = shuffle(extractPageLinks(indexHtml, base));
  dbg(`[${key}] index has ${artistPages.length} artist pages`);

  // Flat index (e.g. cc): PDFs linked directly from the index page itself
  if (artistPages.length === 0) {
    tried.push(index);
    dbg(`[${key}] flat index — trying direct extract`);
    const direct = await tryExtractMedia(index, mediaType);
    dbg(`[${key}] direct extract: ${direct ? `FOUND ${direct.type}` : 'null'}`);
    if (direct) return { ...direct, category: key, categoryLabel: label };
  }

  for (const artistUrl of artistPages.slice(0, 10)) {
    tried.push(artistUrl);
    dbg(`[${key}] trying artist page ${artistUrl}`);

    const isIndex = artistUrl.endsWith('/index.html');
    // On index pages: try rich media (video/audio/pdf) but never text/image —
    // index pages like johnson/index.html have text but we want their sub-pages instead.
    const directType = isIndex && mediaType === null ? 'rich' : mediaType;

    const direct = await tryExtractMedia(artistUrl, directType);
    if (direct) {
      dbg(`[${key}] FOUND ${direct.type} at artist page`);
      return { ...direct, category: key, categoryLabel: label };
    }

    const artistHtml = await fetchHtml(artistUrl).catch(err => {
      dbg(`[${key}] skipping ${artistUrl}: ${err.message}`);
      return null;
    });
    if (!artistHtml) continue;

    const workPages = shuffle(extractPageLinks(artistHtml, base));
    dbg(`[${key}] artist has ${workPages.length} work pages`);
    for (const workUrl of workPages.slice(0, 5)) {
      tried.push(workUrl);
      dbg(`[${key}]   trying work page ${workUrl}`);
      const result = await tryExtractMedia(workUrl, mediaType);
      if (result) {
        dbg(`[${key}] FOUND ${result.type} at work page`);
        return { ...result, category: key, categoryLabel: label };
      }
    }
    dbg(`[${key}] no media in artist ${artistUrl}`);
  }

  dbg(`[${key}] FAILED — no ${mediaType} in ${tried.length} pages`);

  if (DEBUG) {
    return {
      type: 'failed',
      category: key,
      categoryLabel: label,
      mediaType,
      indexUrl: index,
      tried,
      reason: `No ${mediaType} media found in ${tried.length} pages`,
    };
  }

  return null;
}

export async function fetchRandomContent(categoryKey) {
  if (categoryKey) {
    const category = CATEGORIES.find(c => c.key === categoryKey);
    if (!category) throw new Error(`Unknown category: ${categoryKey}`);
    const result = await fetchFromCategory(category);
    if (result) return result;
    throw new Error(`Could not find media content for category: ${categoryKey}`);
  }

  if (DEBUG) {
    // In debug mode: pick one category, return whatever happens (success or failure card)
    const category = randomFrom(CATEGORIES);
    return fetchFromCategory(category);
  }

  // No specific category — try up to 5 random ones before giving up
  const pool = shuffle([...CATEGORIES]);
  for (const category of pool.slice(0, 5)) {
    const result = await fetchFromCategory(category).catch(err => {
      console.warn(`[scraper] ${category.key} failed: ${err.message}`);
      return null;
    });
    if (result) return result;
    if (!result) console.warn(`[scraper] ${category.key}: no media found, trying next`);
  }

  throw new Error('Could not find media content after multiple attempts');
}
