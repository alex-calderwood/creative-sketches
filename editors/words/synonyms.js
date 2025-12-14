const express = require('express');
const WordPOS = require('wordpos');

const wordpos = new WordPOS();
const router = express.Router();

async function getSynonyms(word) {
  const results = await wordpos.lookup(word.toLowerCase().trim());
  return [...new Set(results.flatMap(r => r.synonyms))];
}

router.get('/synonyms', async (req, res) => {
  const word = req.query.word;
  if (!word) return res.status(400).json({ error: 'Missing word parameter' });
  
  try {
    const synonyms = await getSynonyms(word);
    res.json({ word, synonyms });
  } catch (e) {
    res.status(500).json({ error: 'Lookup failed' });
  }
});

module.exports = router;
