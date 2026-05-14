import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { fetchRandomContent } from './scraper.js';
import { CATEGORIES } from './categories.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// In production, serve built client under /ubutok
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use('/ubutok', express.static(clientDist));
}

const DEBUG = process.env.DEBUG === 'true';

app.get('/api/next', async (req, res) => {
  const { category } = req.query;
  if (DEBUG) console.log(`[api] GET /api/next category=${category || 'random'}`);
  try {
    const content = await fetchRandomContent(category || null);
    if (DEBUG) console.log(`[api] result type=${content?.type} category=${content?.category}`);
    res.json(content);
  } catch (err) {
    console.error('[api] Scrape error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Proxy audio so Web Audio API AnalyserNode can access it (requires CORS)
app.get('/api/audio-proxy', async (req, res) => {
  const { url } = req.query;
  if (!url || !url.startsWith('https://ubuweb.com/')) {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  try {
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UbuTok/1.0)' },
      signal: AbortSignal.timeout(30000),
    });
    if (!upstream.ok) return res.status(upstream.status).end();
    const ct = upstream.headers.get('content-type') || 'audio/mpeg';
    res.set('Content-Type', ct);
    res.set('Cache-Control', 'public, max-age=3600');
    res.set('Access-Control-Allow-Origin', '*');
    upstream.body.pipe(res);
  } catch (err) {
    console.error(`[audio-proxy] error for ${url}:`, err.message);
    res.status(502).end();
  }
});

// Proxy PDFs so pdfjs-dist can load them without CORS issues
app.get('/api/pdf-proxy', async (req, res) => {
  const { url } = req.query;
  if (!url || !url.startsWith('https://ubuweb.com/')) {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  try {
    const upstream = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UbuTok/1.0)' },
      signal: AbortSignal.timeout(15000),
    });
    const ct = upstream.headers.get('content-type') || '';
    if (DEBUG) console.log(`[pdf-proxy] ${upstream.status} ${ct} <- ${url}`);
    if (!upstream.ok) {
      console.error(`[pdf-proxy] upstream ${upstream.status} for ${url}`);
      return res.status(upstream.status).end();
    }
    res.set('Content-Type', ct || 'application/pdf');
    res.set('Cache-Control', 'public, max-age=3600');
    upstream.body.pipe(res);
  } catch (err) {
    console.error(`[pdf-proxy] error for ${url}:`, err.message);
    res.status(502).end();
  }
});

app.get('/api/categories', (_, res) => {
  res.json(CATEGORIES.map(c => ({ key: c.key, label: c.label })));
});

if (process.env.NODE_ENV === 'production') {
  app.get('/ubutok/*', (_, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`UbuTok server running on http://localhost:${PORT}`);
});
