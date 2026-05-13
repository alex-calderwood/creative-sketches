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
  const links = new Set();
  $('a[href$=".html"]').each((_, el) => {
    const href = $(el).attr('href');
    const url = resolveUrl(href, base);
    if (url && url.startsWith(base) && !url.includes('index.html')) {
      links.add(url);
    }
  });
  return [...links];
}

function cleanTitle(raw) {
  const s = raw.trim();
  if (!s.toLowerCase().startsWith('ubuweb')) return s;
  const colonIdx = s.indexOf(': ');
  if (colonIdx !== -1) return s.slice(colonIdx + 2).trim();
  const dashIdx = s.indexOf(' - ');
  if (dashIdx !== -1) return s.slice(dashIdx + 3).trim();
  return s.replace(/^ubuweb\S*\s*/i, '').trim();
}

function preserveLineBreaks($) {
  $('br').replaceWith('\n');
}

function normalizeWhitespace(text) {
  return text
    .replace(/[ \t]+/g, ' ')       // collapse horizontal whitespace
    .replace(/\n{3,}/g, '\n\n')    // max two consecutive newlines
    .trim();
}

function extractDescription($) {
  preserveLineBreaks($);

  // Newer film pages use #ubudesc
  const ubudesc = $('#ubudesc').text().trim();
  if (ubudesc.length > 80) return normalizeWhitespace(ubudesc).slice(0, 3000);

  // Older pages: pick the td with the most text
  let best = '';
  $('td').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > best.length) best = text;
  });
  return normalizeWhitespace(best).slice(0, 3000);
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
    description: extractDescription($),
    mediaUrl: videoSrc.startsWith('http') ? videoSrc : 'https://ubuweb.com' + videoSrc,
    mp4Url,
    sourceUrl,
  };
}

function extractAudioDescription($) {
  preserveLineBreaks($);
  const bodyText = $('body').text();
  const notesIdx = bodyText.search(/\bNOTES\b/);
  if (notesIdx !== -1) {
    return normalizeWhitespace(bodyText.slice(notesIdx + 5)).slice(0, 3000);
  }
  return extractDescription($);
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
    description: extractAudioDescription($),
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
    description: extractDescription($),
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
  const text = normalizeWhitespace(raw).slice(0, 8000);

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
    description: extractDescription($),
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
    if (mediaType === 'text')  return extractText($, url);
    if (mediaType === 'pdf')   return extractPdf($, url);
    return extractVideo($, url) || extractAudio($, url) || extractPdf($, url) || extractImage($, url) || extractText($, url);
  } catch {
    return null;
  }
}

const DEBUG = process.env.DEBUG === 'true';

async function fetchFromCategory(category) {
  const { base, index, mediaType, key, label } = category;
  const tried = [];

  const indexHtml = await fetchHtml(index);
  const artistPages = shuffle(extractPageLinks(indexHtml, base));

  // Flat index (e.g. cc): PDFs linked directly from the index page itself
  if (artistPages.length === 0) {
    tried.push(index);
    const direct = await tryExtractMedia(index, mediaType);
    if (direct) return { ...direct, category: key, categoryLabel: label };
  }

  for (const artistUrl of artistPages.slice(0, 10)) {
    tried.push(artistUrl);
    const direct = await tryExtractMedia(artistUrl, mediaType);
    if (direct) return { ...direct, category: key, categoryLabel: label };

    const artistHtml = await fetchHtml(artistUrl).catch(() => null);
    if (!artistHtml) continue;

    const workPages = shuffle(extractPageLinks(artistHtml, base));
    for (const workUrl of workPages.slice(0, 5)) {
      tried.push(workUrl);
      const result = await tryExtractMedia(workUrl, mediaType);
      if (result) return { ...result, category: key, categoryLabel: label };
    }
  }

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

export async function debugScrape(categoryKey) {
  const log = [];

  const category = CATEGORIES.find(c => c.key === categoryKey);
  if (!category) return { success: false, log: [{ step: 'error', msg: `Unknown category: ${categoryKey}` }] };

  log.push({ step: 'category', key: category.key, label: category.label, mediaType: category.mediaType, index: category.index });

  let indexPages;
  try {
    const indexHtml = await fetchHtml(category.index);
    indexPages = extractPageLinks(indexHtml, category.base);
    log.push({ step: 'index', url: category.index, pagesFound: indexPages.length, sample: indexPages.slice(0, 8) });
  } catch (err) {
    log.push({ step: 'error', msg: `Failed to fetch index: ${err.message}` });
    return { success: false, log };
  }

  const sampled = shuffle([...indexPages]).slice(0, 6);

  for (const pageUrl of sampled) {
    const pageEntry = { step: 'page', url: pageUrl };
    try {
      const html = await fetchHtml(pageUrl);
      const $ = cheerio.load(html);

      const videoSrc = $('video source').first().attr('src') || null;
      const mp3Count = $('a[href$=".mp3"]').length;
      const pdfLinks = [];
      $('a[href$=".pdf"]').each((_, el) => pdfLinks.push($(el).attr('href')));
      const imgCount = $('img').length;
      const subPages = extractPageLinks(html, category.base);

      pageEntry.title = $('title').text().trim();
      pageEntry.found = { video: !!videoSrc, videoSrc, mp3s: mp3Count, pdfs: pdfLinks.slice(0, 4), images: imgCount };
      pageEntry.subPages = subPages.slice(0, 6);

      const media = await tryExtractMedia(pageUrl, category.mediaType);
      if (media) {
        pageEntry.extracted = { type: media.type, mediaUrl: media.mediaUrl };
        log.push(pageEntry);
        log.push({ step: 'success', result: { ...media, category: category.key, categoryLabel: category.label } });
        return { success: true, result: { ...media, category: category.key, categoryLabel: category.label }, log };
      }

      // Try sub-pages
      for (const subUrl of subPages.slice(0, 3)) {
        const subMedia = await tryExtractMedia(subUrl, category.mediaType);
        if (subMedia) {
          pageEntry.extractedFrom = subUrl;
          pageEntry.extracted = { type: subMedia.type, mediaUrl: subMedia.mediaUrl };
          log.push(pageEntry);
          log.push({ step: 'success', result: { ...subMedia, category: category.key, categoryLabel: category.label } });
          return { success: true, result: { ...subMedia, category: category.key, categoryLabel: category.label }, log };
        }
      }

      pageEntry.extracted = null;
    } catch (err) {
      pageEntry.error = err.message;
    }
    log.push(pageEntry);
  }

  log.push({ step: 'failed', msg: `No ${category.mediaType} media found in ${sampled.length} sampled pages` });
  return { success: false, log };
}
