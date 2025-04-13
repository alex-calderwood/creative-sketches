const http = require("http");
const fs = require("fs").promises;
const path = require("path");

// File handling function
async function getFileContent(requestPath = '') {
    try {
        // Clean up the path and ensure it starts from our files directory
        const normalizedPath = path.normalize(requestPath).replace(/^(\.\.[\/\\])+/, '');
        const fullPath = path.join(__dirname, 'files', normalizedPath);
        
        const stats = await fs.stat(fullPath);
        
        if (stats.isDirectory()) {
            // Return directory listing
            const files = await fs.readdir(fullPath);
            const fileList = await Promise.all(files.map(async (file) => {
                const filePath = path.join(fullPath, file);
                const fileStats = await fs.stat(filePath);
                return {
                    name: file,
                    isDirectory: fileStats.isDirectory(),
                    size: fileStats.size,
                    lastModified: fileStats.mtime
                };
            }));
            
            return {
                type: 'directory',
                path: normalizedPath,
                contents: fileList
            };
        } else {
            // Return file contents
            const content = await fs.readFile(fullPath, 'utf8');
            return {
                type: 'file',
                path: normalizedPath,
                content: content
            };
        }
    } catch (error) {
        throw error;
    }
}

// Create server
const server = http.createServer(async (req, res) => {
    try {
        // Serve the HTML interface at root
        if (req.url === '/') {
            const htmlContent = await fs.readFile(path.join(__dirname, 'index.html'), 'utf8');
            res.setHeader('Content-Type', 'text/html');
            res.end(htmlContent);
            return;
        }

        // Handle file requests
        if (req.url.startsWith('/files')) {
            let requestPath = decodeURIComponent(req.url.replace('/files', ''));
            try {
                const result = await getFileContent(requestPath);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(result));
            } catch (error) {
                if (error.code === 'ENOENT') {
                    res.statusCode = 404;
                    res.end(JSON.stringify({ error: 'File or directory not found' }));
                } else {
                    throw error;
                }
            }
            return;
        }

        // Handle 404 for unknown routes
        res.statusCode = 404;
        res.end('Not found');

    } catch (error) {
        console.error('Server error:', error);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Internal server error' }));
    }
});

const PORT = 3000;
server.listen(PORT, () => {
    console.log(`File browser server running at http://localhost:${PORT}`);
});