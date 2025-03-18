const express = require('express');
const serveStatic = require('serve-static');
const history = require('connect-history-api-fallback');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Available projects: ${projects.join(', ')}`);
});
