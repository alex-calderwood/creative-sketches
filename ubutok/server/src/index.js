import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { fetchRandomContent, debugScrape } from './scraper.js';
import { CATEGORIES } from './categories.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// In production, serve built client under /avantok
if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use('/avantok', express.static(clientDist));
}

app.get('/api/next', async (req, res) => {
  const { category } = req.query;
  try {
    const content = await fetchRandomContent(category || null);
    res.json(content);
  } catch (err) {
    console.error('Scrape error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/debug/:category', async (req, res) => {
  const result = await debugScrape(req.params.category);
  res.json(result);
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
    if (!upstream.ok) return res.status(upstream.status).end();
    res.set('Content-Type', upstream.headers.get('content-type') || 'application/pdf');
    res.set('Cache-Control', 'public, max-age=3600');
    upstream.body.pipe(res);
  } catch (err) {
    console.error('PDF proxy error:', err.message);
    res.status(502).end();
  }
});

app.get('/api/categories', (_, res) => {
  res.json(CATEGORIES.map(c => ({ key: c.key, label: c.label })));
});

if (process.env.NODE_ENV === 'production') {
  app.get('/avantok/*', (_, res) => {
    res.sendFile(path.join(__dirname, '../../client/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`UbuTok server running on http://localhost:${PORT}`);
});
