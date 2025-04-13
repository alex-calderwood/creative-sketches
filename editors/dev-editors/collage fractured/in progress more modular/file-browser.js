class FileBrowser {
    constructor(containerId) {
        this.currentPath = '';
        this.currentContent = null;
        this.selectedContent = null;
        this.container = document.getElementById(containerId);
        
        this.init();
    }

    async init() {
        // Load the HTML template
        const response = await fetch('file-browser.html');
        const html = await response.text();
        this.container.innerHTML = html;
        
        // Initialize event listeners
        this.initializeEventListeners();
        
        // Load initial directory
        this.handleFileNavigation('/');
    }

    async fetchFiles(path) {
        path = path.replace(/\/+/g, '/');
        const encodedPath = path.split('/').map(part => encodeURIComponent(part)).join('/');
        const response = await fetch('/files' + encodedPath);
        if (!response.ok) throw new Error('Failed to fetch');
        return response.json();
    }

    processContent(content) {
        const markdownOpt = document.getElementById('markdownOpt').checked;
        const htmlOpt = document.getElementById('htmlOpt').checked;
        const linebreakOpt = document.getElementById('linebreakOpt').checked;
        const allLinebreakOpt = document.getElementById('allLinebreakOpt').checked;

        let processed = content;

        if (markdownOpt) {
            processed = processed.replace(/^#\s[^\n]*\n/, '');
        }

        if (htmlOpt) {
            const match = processed.match(/<body[^>]*>([\s\S]*)<\/body>/i);
            if (match) processed = match[1];
        }

        if (linebreakOpt) {
            processed = processed.replace(/\n\n+/g, '\n');
        }

        if (allLinebreakOpt) {
            processed = processed.replace(/\s+/g, ' ');
        }

        return processed;
    }

    async handleFileNavigation(path) {
        try {
            const data = await this.fetchFiles(path);
            
            if (data.type === 'directory') {
                this.currentPath = path;
                this.displayFileList(data);
                this.updateBreadcrumb();
            } else {
                const currentContent = this.processContent(data.content);
                this.displayFileContent(data.path, currentContent);
            }
        } catch (error) {
            this.showError('Error: ' + error.message);
        }
    }

    displayFileList(data) {
        const fileList = document.getElementById('fileList');
        fileList.innerHTML = '';

        if (this.currentPath !== '/') {
            const upDir = document.createElement('div');
            upDir.className = 'file-item directory';
            upDir.innerHTML = `
                <span class="file-icon">📁</span>
                <span>..</span>
            `;
            upDir.onclick = () => {
                const parts = this.currentPath.split('/').filter(Boolean);
                parts.pop();
                const parentPath = parts.length ? '/' + parts.join('/') : '/';
                this.handleFileNavigation(parentPath);
            };
            fileList.appendChild(upDir);
        }

        data.contents.forEach(file => {
            const item = document.createElement('div');
            item.className = `file-item ${file.isDirectory ? 'directory' : ''}`;
            item.innerHTML = `
                <span class="file-icon">${file.isDirectory ? '📁' : '📄'}</span>
                <span>${file.name}</span>
            `;
            
            let fullPath;
            if (this.currentPath === '/') {
                fullPath = '/' + file.name;
            } else {
                fullPath = this.currentPath + '/' + file.name;
            }
            item.onclick = () => this.handleFileNavigation(fullPath);
            
            fileList.appendChild(item);
        });
    }

    displayFileContent(path, content) {
        const contentTitle = document.getElementById('contentTitle');
        const fileContent = document.getElementById('fileContent');
        
        contentTitle.textContent = path.split('/').pop();
        fileContent.textContent = content;
        const selectButton = document.getElementById('selectButton');
        selectButton.disabled = false;
        selectButton.onclick = () => {
            document.getElementById('selectedDocument').textContent = path;
            this.selectedContent = this.currentContent;
        }; 

        fileContent.dataset.originalContent = content;

        ['markdownOpt', 'htmlOpt', 'linebreakOpt', 'allLinebreakOpt'].forEach(id => {
            document.getElementById(id).onchange = () => {
                this.currentContent = this.processContent(fileContent.dataset.originalContent);
                fileContent.textContent = this.currentContent;
            };
        }); 
    }

    updateBreadcrumb() {
        document.getElementById('currentPath').textContent = `${this.currentPath}`;
    }

    showError(message) {
        const fileContent = document.getElementById('fileContent');
        fileContent.innerHTML = `<div class="error">${message}</div>`;
    }

    initializeEventListeners() {
        // Add any additional event listeners here
    }
}
