const express = require('express');
const Parser = require('rss-parser');
const https = require('https');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const parser = new Parser({
  customFields: {
    item: [
      ['letterboxd:filmTitle', 'filmTitle'],
      ['letterboxd:filmYear', 'filmYear'],
    ],
  },
});

// Fetch with real browser headers to avoid Letterboxd's 403
function fetchXML(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
    }, (res) => {
      if (res.statusCode === 403) {
        return reject(Object.assign(new Error('Letterboxd denied access — the watchlist may be private'), { status: 403 }));
      }
      if (res.statusCode === 404) {
        return reject(Object.assign(new Error('User not found on Letterboxd'), { status: 404 }));
      }
      if (res.statusCode !== 200) {
        return reject(Object.assign(new Error(`Letterboxd returned ${res.statusCode}`), { status: res.statusCode }));
      }
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve(body));
    });
    req.on('error', reject);
    req.setTimeout(12000, () => { req.destroy(); reject(new Error('Request timed out')); });
  });
}

// In-memory cache with TTL
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

function extractPoster(content) {
  if (!content) return null;
  const match = content.match(/<img[^>]+src="([^"]+)"/);
  return match ? match[1] : null;
}

function extractSlug(link) {
  if (!link) return null;
  const match = link.match(/\/film\/([^/]+)\/?/);
  return match ? match[1] : null;
}

async function fetchWatchlist(username) {
  const key = username.toLowerCase();
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const url = `https://letterboxd.com/${encodeURIComponent(key)}/watchlist/rss/`;
  const xml = await fetchXML(url);
  const feed = await parser.parseString(xml);

  const films = feed.items.map(item => {
    const slug = extractSlug(item.link);
    const rawTitle = item.filmTitle || item.title || '';
    const title = rawTitle.replace(/\s*\(\d{4}\)\s*$/, '').trim();

    return {
      id: slug || `${title}-${item.filmYear || ''}`.toLowerCase().replace(/\s+/g, '-'),
      title,
      year: item.filmYear || null,
      poster: extractPoster(item.content || item['content:encoded'] || ''),
      link: item.link || null,
      slug,
    };
  });

  const data = { username: key, displayName: feed.title || key, films };
  cache.set(key, { data, ts: Date.now() });
  return data;
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/watchlist/:username', async (req, res) => {
  try {
    const data = await fetchWatchlist(req.params.username);
    res.json(data);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || 'Failed to fetch watchlist' });
  }
});

app.post('/api/compare', async (req, res) => {
  const { usernames } = req.body;
  if (!Array.isArray(usernames) || usernames.length < 2) {
    return res.status(400).json({ error: 'Provide at least 2 usernames' });
  }
  if (usernames.length > 4) {
    return res.status(400).json({ error: 'Maximum 4 users supported' });
  }

  let watchlists;
  try {
    watchlists = await Promise.all(usernames.map(u => fetchWatchlist(u)));
  } catch (err) {
    return res.status(err.status || 500).json({ error: err.message || 'Failed to fetch watchlists' });
  }

  // Map of film ID -> film object per user
  const filmMaps = watchlists.map(w => {
    const m = new Map();
    w.films.forEach(f => m.set(f.id, f));
    return m;
  });

  const allIds = new Set(watchlists.flatMap(w => w.films.map(f => f.id)));

  const overlap = [];
  const partial = [];
  const unique = watchlists.map(() => []);

  allIds.forEach(id => {
    const presence = filmMaps.map(m => m.has(id));
    const count = presence.filter(Boolean).length;
    const film = filmMaps[presence.indexOf(true)].get(id);

    if (count === usernames.length) {
      overlap.push(film);
    } else if (count > 1) {
      const sharedBy = usernames.filter((_, i) => presence[i]);
      partial.push({ ...film, sharedBy });
    } else {
      const ownerIdx = presence.indexOf(true);
      unique[ownerIdx].push(film);
    }
  });

  res.json({
    usernames,
    users: watchlists.map(w => ({ username: w.username, displayName: w.displayName, count: w.films.length })),
    overlap,
    partial,
    unique,
  });
});

app.listen(PORT, () => {
  console.log(`Letterboxd Compare → http://localhost:${PORT}`);
});
