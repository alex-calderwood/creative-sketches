// Synonyms API router — mounted by server.js at /editors/api
// WordNet (Node): GET /editors/api/synonyms-wordnet/synonyms?word=<word>&pos=<noun|verb|adjective|adverb>
// The pos parameter is optional; if omitted, looks up all POS.

const express = require('express');
const http = require('http');
const WordPOS = require('wordpos'); // https://github.com/moos/wordpos?tab=readme-ov-file

const PROXIES = {
  'synonyms-online': 'http://localhost:3019',
  'synonyms-cache': 'http://localhost:3020',
}

let stoplist = new Set([
  "Hera"
]);

const wordpos = new WordPOS();
const router = express.Router();

const posLookups = {
  noun: (w) => wordpos.lookupNoun(w),
  verb: (w) => wordpos.lookupVerb(w),
  adjective: (w) => wordpos.lookupAdjective(w),
  adverb: (w) => wordpos.lookupAdverb(w),
};

async function getSynonyms(word, pos) {
  const w = word.toLowerCase().trim();
  const lookup = pos && posLookups[pos] ? posLookups[pos] : (w) => wordpos.lookup(w);
  const results = await lookup(w);
  let synonyms = [...new Set(results.flatMap(r => r.synonyms))];
  synonyms = synonyms.filter(s => !stoplist.has(s));

  return synonyms;
}

// Synonym Routes
router.use('/synonyms-online', (req, res) => {
  const url = `${PROXIES['synonyms-online']}${req.url}`;
  http.get(url, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  }).on('error', () => {
    res.status(502).json({ error: 'synonyms-online server unavailable' });
  });
});


router.use('/synonyms-cache', (req, res) => {
  const url = `${PROXIES['synonyms-cache']}${req.url}`;
  http.get(url, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  }).on('error', () => {
    res.status(502).json({ error: 'synonyms-cache server unavailable' });
  });
});

// TODO test replacing the above two with this:
// for (const [key, value] of Object.entries(PROXIES)) {
//   router.use(`/${key}`, (req, res) => {
//     const url = `${value}${req.url}`;
//     http.get(url, (proxyRes) => {
//       res.writeHead(proxyRes.statusCode, proxyRes.headers);
//       proxyRes.pipe(res);
//     }).on('error', () => {
//       res.status(502).json({ error: `${key} server unavailable` });
//     });
//   });
// }

router.get('/synonyms-wordnet/synonyms', async (req, res) => {
  const { word, pos } = req.query;
  if (!word) return res.status(400).json({ error: 'Missing word parameter' });
  
  try {
    const synonyms = await getSynonyms(word, pos);
    res.json({ word, pos: pos || null, synonyms });
  } catch (e) {
    res.status(500).json({ error: 'Lookup failed' });
  }
});

module.exports = router;
