#!/usr/bin/env node
// Simple CLI for querying synonyms
// Usage: node words/synonyms-cli.js
// Or: npm run synonyms

const readline = require('readline');
const http = require('http');

const NODE_PORT = 3008;
const PYTHON_PORT = 3019;

async function getWordnetSynonyms(word, pos) {
  return new Promise((resolve) => {
    const posParam = pos ? `&pos=${encodeURIComponent(pos)}` : '';
    const path = `/editors/api/synonyms?word=${encodeURIComponent(word)}${posParam}`;
    
    const options = {
      hostname: 'localhost',
      port: NODE_PORT,
      path: path,
      method: 'GET',
      timeout: 3000  // 3 seconds - WordPOS is fast
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve({ 
            success: true, 
            source: 'wordnet',
            data: JSON.parse(data) 
          });
        } catch (e) {
          resolve({ 
            success: false, 
            source: 'wordnet',
            error: 'Invalid JSON response' 
          });
        }
      });
    });
    
    req.on('error', (e) => {
      resolve({ 
        success: false, 
        source: 'wordnet',
        error: 'Server not responding or not running' 
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ 
        success: false, 
        source: 'wordnet',
        error: 'Request timeout' 
      });
    });
    
    req.end();
  });
}

async function getWordhoardSynonyms(word, pos) {
  return new Promise((resolve) => {
    const posParam = pos ? `&pos=${encodeURIComponent(pos)}` : '';
    const path = `/synonyms?word=${encodeURIComponent(word)}${posParam}`;
    
    const options = {
      hostname: 'localhost',
      port: PYTHON_PORT,
      path: path,
      method: 'GET',
      timeout: 15000  // 15 seconds - wordhoard can be slow, especially first query
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve({ 
            success: true, 
            source: 'wordhoard',
            data: JSON.parse(data) 
          });
        } catch (e) {
          resolve({ 
            success: false, 
            source: 'wordhoard',
            error: 'Invalid JSON response' 
          });
        }
      });
    });
    
    req.on('error', (e) => {
      resolve({ 
        success: false, 
        source: 'wordhoard',
        error: 'Server not responding or not running' 
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({ 
        success: false, 
        source: 'wordhoard',
        error: 'Request timeout (wordhoard can be slow on first query)' 
      });
    });
    
    req.end();
  });
}

async function getBothSynonyms(word, pos) {
  const [nodeResult, pythonResult] = await Promise.all([
    getWordnetSynonyms(word, pos),
    getWordhoardSynonyms(word, pos)
  ]);
  
  return { nodeResult, pythonResult };
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function main() {
  console.log('Synonyms CLI - Queries both Node.js and Python servers (Ctrl-C to exit)\n');
  
  while (true) {
    const word = await prompt('Enter a word: ');
    if (!word.trim()) {
      console.log('No word provided.\n');
      continue;
    }
    
    const posInput = await prompt('Enter part of speech (noun/verb/adjective/adverb, or press Enter for all): ');
    const pos = posInput.trim().toLowerCase() || null;
    
    console.log('\nQuerying servers...\n');
    
    const { nodeResult, pythonResult } = await getBothSynonyms(word, pos);
    
    // Display wordnet result
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`${nodeResult.source}:`);
    if (nodeResult.success) {
      console.log(JSON.stringify(nodeResult.data, null, 2));
    } else {
      console.log(`✗ ${nodeResult.error}`);
    }
    
    console.log();
    
    // Display wordhoard result
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`${pythonResult.source}:`);
    if (pythonResult.success) {
      console.log(JSON.stringify(pythonResult.data, null, 2));
    } else {
      console.log(`✗ ${pythonResult.error}`);
    }
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}

main();

