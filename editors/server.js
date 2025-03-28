const express = require('express');
const serveStatic = require('serve-static');
const history = require('connect-history-api-fallback');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3008;

// Discover all project directories within the editors subdirectory
function getProjectDirectories() {
  const editorsDir = path.join(__dirname, 'editors');
  
  // Check if editors directory exists
  if (!fs.existsSync(editorsDir)) {
    console.error('Error: editors directory not found at', editorsDir);
    return [];
  }
  
  // Get all items in the editors directory
  const items = fs.readdirSync(editorsDir);
  
  // Filter for directories only and exclude node_modules and other common non-project folders
  const exclusions = ['node_modules', '.git', 'dist', 'build'];
  const projectDirs = items.filter(item => {
    const fullPath = path.join(editorsDir, item);
    return fs.statSync(fullPath).isDirectory() && !exclusions.includes(item);
  });
  
  console.log('Found projects in editors directory:', projectDirs);
  return projectDirs;
}

// Get project directories
// Get all project directories within the editors folder
const projects = getProjectDirectories();
console.log('Discovered projects within editors directory:', projects);

// Create a simple index page that lists all projects
app.get('/', (req, res) => {
  let html = '<html><head><title>Creative Sketches Editor Projects</title>';
  html += '<style>body{font-family:sans-serif;max-width:800px;margin:0 auto;padding:20px;} ';
  html += 'h1{color:#333;} ul{list-style-type:none;padding:0;} ';
  html += 'li{margin:10px 0;padding:10px;border-radius:5px;background:#f5f5f5;} ';
  html += 'a{color:#0066cc;text-decoration:none;font-size:18px;} ';
  html += 'a:hover{text-decoration:underline;}</style></head><body>';
  html += '<h1>Creative Sketches Editor Projects</h1><ul>';
  
  projects.forEach(project => {
    html += `<li><a href="/editors/${project}/">${project}</a></li>`;
  });
  
  html += '</ul></body></html>';
  res.send(html);
});

// Also serve the editors index at /editors for direct access
app.get('/editors', (req, res) => {
  res.redirect('/');
});

// Set up static serving for each project directory
projects.forEach(project => {
  const projectPath = path.join(__dirname, 'editors', project);
  
  // Create a router for this project
  const projectRouter = express.Router();
  
  // Apply history API fallback for SPAs if needed
  projectRouter.use(history());
  
  // Serve static files
  projectRouter.use(serveStatic(projectPath));
  
  // Mount the router at the project path with 'editors' prefix
  app.use(`/editors/${project}`, projectRouter);
  
  console.log(`Serving ${project} at /editors/${project} from ${projectPath}`);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Available projects: ${projects.join(', ')}`);
});