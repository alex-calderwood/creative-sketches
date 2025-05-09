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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log(`Available projects: ${projects.map(p => p.name).join(', ')}`);
});