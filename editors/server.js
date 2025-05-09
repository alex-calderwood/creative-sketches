const express = require('express');
const serveStatic = require('serve-static');
const history = require('connect-history-api-fallback');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3008;

// Discover all project directories within the editors subdirectory
function getProjets() {
  const editorsDir = path.join(__dirname, 'editors');
  
  // Check if editors directory exists
  if (!fs.existsSync(editorsDir)) {
    console.error('Error: editors directory not found at', editorsDir);
    return Promise.resolve([]);
  }
  
  // Get all items in the editors directory
  const items = fs.readdirSync(editorsDir);
  
  // Filter for directories only and exclude node_modules and other common non-project folders
  const exclusions = ['node_modules', '.git', 'dist', 'build'];
  const projectDirs = items.filter(item => {
    const fullPath = path.join(editorsDir, item);
    return fs.statSync(fullPath).isDirectory() && !exclusions.includes(item);
  });
  
  console.log('Project names:', projectDirs);

  // Create an array of promises for reading about.json files
  const projectPromises = projectDirs.map(dir => {
    const aboutPath = path.join(editorsDir, dir, 'about.json');
    const defaultAbout = {
      url: dir,
      name: dir
    };

    return new Promise((resolve) => {
      fs.readFile(aboutPath, 'utf8', (err, data) => {
        if (err) {
          console.log(`Error reading about.json for ${dir}:`, err);
          resolve(defaultAbout);
          return;
        }
        try {
          const aboutData = JSON.parse(data);
          resolve({
            url: dir,
            name: aboutData.name || dir,
            description: aboutData.description
          });
        } catch (e) {
          console.log(`Error parsing about.json for ${dir}:`, e);
          resolve(defaultAbout);
        }
      });
    });
  });

  return Promise.all(projectPromises);
}

// Get project directories
let projects = [];
getProjets().then(projectList => {
  projects = projectList;
  console.log('Discovered projects within editors directory:', projects);

  // Set up static serving for each project directory
  // First serve static files from the editors directory itself
  app.use('/editors', serveStatic(path.join(__dirname, 'editors')));

  projects.forEach(project => {
    const projectPath = path.join(__dirname, 'editors', project.url);
    // Create a router for this project
    const projectRouter = express.Router();
    
    // Apply history API fallback for SPAs if needed
    projectRouter.use(history());
    
    // Serve static files
    projectRouter.use(serveStatic(projectPath));
    
    // Mount the router at the project path with 'editors' prefix
    app.use(`/editors/${project.url}`, projectRouter);
    
    console.log(`Serving ${project.name} at /editors/${project.url} from ${projectPath}`);
  });

  // Serve wooden.avif specifically
  app.get('/editors/wooden.avif', (req, res) => {
    const filePath = path.join(__dirname, 'editors', 'wooden.avif');
    console.log('Attempting to serve wooden.avif from:', filePath);
    console.log('File exists:', fs.existsSync(filePath));
    res.sendFile(filePath);
  });
});

// Project Directory
app.get('/', (req, res) => {
  // Read the index.html template
  const indexPath = path.join(__dirname, 'index.html');
  
  fs.readFile(indexPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading index.html:', err);
      return res.status(500).send('Error loading index page');
    }
    
    // Replace the projects array placeholder with actual projects
    const updatedHtml = data.replace(
      'const projects = [];',
      `const projects = ${JSON.stringify(projects)};`
    );
    
    res.send(updatedHtml);
  });
});

// Also serve the editors index at /editors for direct access
app.get('/editors', (req, res) => {
  res.redirect('/');
});

const larderSentencesPath = path.join(__dirname, 'editors', 'larder', 'sentences.json');

// Helper to read sentences.json
function readSentences() {
  try {
    if (!fs.existsSync(larderSentencesPath)) {
      console.error('Error: sentences.json not found at', larderSentencesPath);
      return [];
    }
    const data = fs.readFileSync(larderSentencesPath, 'utf8');
    return JSON.parse(data);
  } catch (e) {
    console.error('Error reading sentences.json:', e);
    return [];
  }
}

// Helper to write sentences.json
function writeSentences(sentences) {
  fs.writeFileSync(larderSentencesPath, JSON.stringify(sentences, null, 2), 'utf8');
}

// GET endpoint to fetch sentences
app.get('/api/sentences', (req, res) => {
  const sentences = readSentences();
  res.json(sentences);
});

// POST endpoint to add a new sentence
app.post('/api/new-sentence', express.json(), (req, res) => {
  const { sentence, index } = req.body;
  if (
    typeof sentence !== 'string' ||
    !sentence.trim() ||
    typeof index !== 'number' ||
    !Number.isInteger(index) ||
    index < 0
  ) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  // Basic sanitization: limit sentence length
  const cleanSentence = sentence.trim().slice(0, 500);
  let sentences = readSentences();
  // Clamp index
  const safeIndex = Math.max(0, Math.min(index, sentences.length));
  sentences.splice(safeIndex, 0, cleanSentence);
  writeSentences(sentences);
  res.json(sentences);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Available projects: ${projects.map(p => p.name).join(', ')}`);
});