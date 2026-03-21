// Synonyms API router — mounted by server.js at /editors/api
// Usage: GET /editors/api/synonyms?word=<word>&pos=<noun|verb|adjective|adverb>
// The pos parameter is optional; if omitted, looks up all POS.

const express = require('express');
const http = require('http');
const WordPOS = require('wordpos'); // https://github.com/moos/wordpos?tab=readme-ov-file

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

router.use('/wordhoard', (req, res) => {
  const url = `http://localhost:3019${req.url}`;
  http.get(url, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  }).on('error', () => {
    res.status(502).json({ error: 'Wordhoard server unavailable' });
  });
});

router.get('/synonyms', async (req, res) => {
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
