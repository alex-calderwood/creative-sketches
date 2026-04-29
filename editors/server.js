const express = require('express');
const serveStatic = require('serve-static');
const history = require('connect-history-api-fallback');
const path = require('path');
const fs = require('fs');
const synonymsRouter = require('./words/synonym_routes');

const app = express();
const port = process.env.PORT || 3008;

const IMAGE_URL_PATH = '/editors/assets/editor-images/'
const IMAGE_FS_PATH = path.join(__dirname, 'assets/editor-images/')

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function injectProjectInfoIntoHtml(html, project) {
  console.log('project', project);
  const replacements = {
    '$PROJECT_NAME': project.name,
    '$PROJECT_ID': project.url
  };
  
  let result = html;
  for (const [placeholder, value] of Object.entries(replacements)) {
    if (html.includes(placeholder)) {
      const safeValue = escapeHtml(value);
      result = result.split(placeholder).join(safeValue);
    }
  }
  return result;
}

// Discover all project directories within the editors subdirectory
function getProjects() {
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
  
  // console.log('Project names:', projectDirs);

  // Create an array of promises for reading about.json files
  const projectPromises = projectDirs.map(dir => {
    const aboutPath = path.join(editorsDir, dir, 'about.json');
    // Default to data that doesn't require the about.json
    const defaultAbout = {
      url: dir,
      dir: dir,
      name: dir,
      hide: false,
      image: null,
    };

    let getImagePathSmart = (imageName, editorName) => {
      // If imageName exists, check if IMAGE_FS_PATH + imageName exists
      if (imageName) {
        const fsPath = path.join(IMAGE_FS_PATH, imageName);
        if (fs.existsSync(fsPath)) {
          return IMAGE_URL_PATH + imageName;
        }
      }
      
      // If imageName doesn't exist or the file doesn't exist, check IMAGE_FS_PATH + editorName
      const editorFsPath = path.join(IMAGE_FS_PATH, editorName + '.png');
      if (fs.existsSync(editorFsPath)) {
        return IMAGE_URL_PATH + editorName + '.png';
      }
      
      // Neither exists, return null
      return null;
    }

    return new Promise((resolve) => {
      fs.readFile(aboutPath, 'utf8', (err, data) => {
        if (err) {
          resolve(defaultAbout);
          return;
        }
        try {
          // Get the data from the actual about.json
          const aboutData = JSON.parse(data);
          const image = getImagePathSmart(aboutData.image, dir);
          
          // Transform old series/version format to new tags format
          let tags = aboutData.tags || {};
          
          // Support backward compatibility: if using old series/version format
          if (aboutData.series && aboutData.version && !aboutData.tags) {
            const seriesList = Array.isArray(aboutData.series) ? aboutData.series : [aboutData.series];
            tags = {};
            seriesList.forEach(tag => {
              tags[tag] = { version: aboutData.version };
            });
          }
          
          resolve({ // resolve the outer Promise
            // Include any other fields that might be in the about.json
            ...aboutData,
            // Override with correct directory-based values
            dir: dir,
            url: aboutData.url || dir,
            name: aboutData.name || dir,
            hide: aboutData.hide == true,
            image: image,
            tags: tags
          });
        } catch (e) {
          resolve(defaultAbout);
        }
      });
    });
  });

  return Promise.all(projectPromises);
}

// Get project directories and corresponding data
let projects = [];
getProjects().then(projectList => {
  projects = projectList.filter(project => !project.hide);

  projects.forEach(project => {
    const projectPath = path.join(__dirname, 'editors', project.dir);
    // Create a router for this project
    const projectRouter = express.Router();

    // Apply history API fallback for SPAs if needed
    projectRouter.use(history());

    // Serve a modified index.html with <title> + <span class="subtitle"> set to project.name
    projectRouter.use((req, res, next) => {
      if (req.method !== 'GET') return next();
      if (req.url !== '/index.html' && req.url !== '/' && req.url !== '') return next();

      const indexPath = path.join(projectPath, 'index.html');
      fs.readFile(indexPath, 'utf8', (err, html) => {
        if (err) {
          console.error('Error reading index.html:', err);
          return next();
        }
        res.type('html').send(injectProjectInfoIntoHtml(html, project));
      });
    });
    
    // Serve static files
    projectRouter.use(serveStatic(projectPath));
    
    // Mount the router at the project path with 'editors' prefix
    app.use(`/editors/${project.url}`, projectRouter);
    
    // console.log(`Serving ${project.name} at /editors/${project.url} from ${projectPath}`);
  });

  // Serve all assets from the root assets directory
  app.use('/assets', serveStatic(path.join(__dirname, 'assets')));
  
  // Also serve assets from the editors/assets path for backward compatibility
  app.use('/editors/assets', serveStatic(path.join(__dirname, 'assets')));

  // 404 handler - must be registered after project routers
  app.use((req, res) => {
    const notFoundPath = path.join(__dirname, '404.html');
    if (req.path.startsWith('/editors/') && req.path !== '/editors/') {
      const slug = req.path.replace('/editors/', '').replace(/\/$/, '');
      const suggestions = findSimilarProjects(slug, projects);
      fs.readFile(notFoundPath, 'utf8', (err, html) => {
        if (err) return res.status(404).send('Not found');
        const injected = html.replace(
          'window.__404_DATA__ || { slug: \'\', suggestions: [] }',
          JSON.stringify({ slug, suggestions })
        );
        res.status(404).type('html').send(injected);
      });
    } else {
      res.status(404).sendFile(notFoundPath);
    }
  });

  app.listen(port, () => {
    console.log(`Available projects: ${projects.map(p => p.name).join(', ')}`);
    console.log(`Running at: http://localhost:${port}/editors`);
  });
});

// Project Directory
app.get('/editors', (req, res) => {
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

// ELO Submission / cohesive narrative
app.use('/editors/drifts', serveStatic(path.join(__dirname, 'drifts')));

app.get('/editors/drifts', (req, res) => {
  const driftsPath = path.join(__dirname, 'drifts', 'drifts-menu.html');
  fs.readFile(driftsPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading drift landing page', err);
      return res.status(500).send('Error loading drifts page');
    }
    res.send(data);
  });
});

app.get('/editors/new-drift', (req, res) => {
  const landingPath = path.join(__dirname, 'drifts', 'landing.html');
  fs.readFile(landingPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading landing page', err);
      return res.status(500).send('Error loading landing page');
    }
    res.send(data);
  });
});


app.use('/editors/vault', serveStatic(path.join(__dirname, 'vault')));

app.use('/editors/api', synonymsRouter);

// Serve all assets from the root assets directory
app.use('/assets', serveStatic(path.join(__dirname, 'assets')));
// Also serve assets from the editors/assets path for backward compatibility
app.use('/editors/assets', serveStatic(path.join(__dirname, 'assets')));


// === === === Larder stuff Larder stuff Larder stuff Larder stuff === === === 
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
app.get('/editors/api/sentences', (req, res) => {
  const sentences = readSentences();
  res.json(sentences);
});

// POST endpoint to add a new sentence
app.post('/editors/api/new-sentence', express.json(), (req, res) => {
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
// === === === End Larder stuff End Larder stuff End Larder stuff End Larder stuff === === === 

// GET endpoint to fetch all projects
app.get('/editors/api/projects', (req, res) => {
  res.json(projects);
});

// GET endpoint to fetch tag descriptions
app.get('/api/tag-descriptions', (req, res) => {
  const tagDescriptionsPath = path.join(__dirname, 'tag-descriptions.json');
  fs.readFile(tagDescriptionsPath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading tag-descriptions.json:', err);
      return res.json({});
    }
    try {
      const descriptions = JSON.parse(data);
      res.json(descriptions);
    } catch (e) {
      console.error('Error parsing tag-descriptions.json:', e);
      res.json({});
    }
  });
});

function findSimilarProjects(slug, projects, maxResults = 3) {
  const scored = projects.map(p => ({
    ...p,
    score: Math.max(similarity(slug, p.url), similarity(slug, p.name.toLowerCase()))
  }));
  return scored
    .filter(p => p.score > 0.25)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
}

function similarity(a, b) {
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;
  if (longer.includes(shorter) || shorter.includes(longer)) return 0.8;
  const dist = levenshtein(a, b);
  return (longer.length - dist) / longer.length;
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}
