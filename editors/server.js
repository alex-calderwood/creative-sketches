const express = require('express');
const serveStatic = require('serve-static');
const history = require('connect-history-api-fallback');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

<<<<<<< Updated upstream
// Load projects from config file
let projects = [];
try {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, 'projects.json'), 'utf8'));
  projects = config.projects || [];
  console.log('Loaded projects from config:', projects);
} catch (error) {
  console.error('Error loading projects config:', error.message);
}

// Create a simple index page that lists all projects
=======

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
  
  // Set up static serving for each project directory
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
});

// Project Directory
>>>>>>> Stashed changes
app.get('/', (req, res) => {
  let html = '<html><head><title>Project Directory</title>';
  html += '<style>body{font-family:sans-serif;max-width:800px;margin:0 auto;padding:20px;} ';
  html += 'h1{color:#333;} ul{list-style-type:none;padding:0;} ';
  html += 'li{margin:10px 0;} a{color:#0066cc;text-decoration:none;font-size:18px;} ';
  html += 'a:hover{text-decoration:underline;}</style></head><body>';
  html += '<h1>Project Directory</h1><ul>';
  
  projects.forEach(project => {
    html += `<li><a href="/${project}/">${project}</a></li>`;
  });
<<<<<<< Updated upstream
  
  html += '</ul></body></html>';
  res.send(html);
});

// Set up static serving for each project directory
projects.forEach(project => {
  const projectPath = path.join(__dirname, project);
  
  // Check if project directory exists
  if (!fs.existsSync(projectPath)) {
    console.warn(`Warning: Project directory ${project} not found at ${projectPath}`);
    return;
  }
  
  // Create a router for this project
  const projectRouter = express.Router();
  
  // Apply history API fallback for SPAs if needed
  projectRouter.use(history());
  
  // Serve static files
  projectRouter.use(serveStatic(projectPath));
  
  // Mount the router at the project path
  app.use(`/${project}`, projectRouter);
  
  console.log(`Serving ${project} at /${project}`);
});

=======
});

// Also serve the editors index at /editors for direct access
app.get('/editors', (req, res) => {
  res.redirect('/');
});

>>>>>>> Stashed changes
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Available projects: ${projects.join(', ')}`);
});