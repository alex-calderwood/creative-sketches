const CSS_PATH = '/editors/vault/01-23-2026/src/components/Modal.css';
export class Modal {
    
    static templateHTML = null;
    static stylesLoaded = false;

    constructor(id, content = '', buttons = null, showCloseX = true) {
        this.id = id;
        this.content = content;
        this.buttons = buttons;
        this.showCloseX = showCloseX;
        this.element = null;

        if (buttons === null) {
            this.buttons = this.defaultButtons();
        }
    }

    hide() {
        if (this.element) {
            this.element.style.display = 'none';
            // Remove keyboard event listener
            document.removeEventListener('keydown', this.keydownHandler, true);
        } else {
            console.error('Modal not found');
        }
    }

    destroy() {
        if (this.element) {
            this.element.remove();
            this.element = null;
        }
    }

    async create() {
        await Modal.loadStyles();
        
        // Create modal element directly
        this.element = document.createElement('div');
        this.element.id = this.id;
        this.element.className = 'modal meta-game';
        this.element.style.display = 'none';
        
        // Create content
        const buttonHTML = this.buttons.map(btn => {
            const btnId = btn.class ? `class="${btn.class}"` : '';
            return `<button ${btnId} data-action="${btn.text.toLowerCase()}">${btn.text}</button>`
        }).join('');
        
        const closeXHTML = this.showCloseX
            ? `<button class="modal-close-x" aria-label="Close">&times;</button>`
            : '';

        this.element.innerHTML = `
            <div class="content-container">
                ${closeXHTML}
                <div class="modal-content">
                    ${this.content}
                </div>
                <div class="modal-buttons">${buttonHTML}</div>
            </div>
        `;
        
        // Attach to DOM
        document.body.appendChild(this.element);
        
        const closeX = this.element.querySelector('.modal-close-x');
        if (closeX) {
            closeX.addEventListener('click', () => this.hide());
        }

        this.buttons.forEach(btn => {
            const button = this.element.querySelector(`[data-action="${btn.text.toLowerCase()}"]`);
            if (button && btn.handler) {
                button.addEventListener('click', btn.handler);
            }
        });
        
        // Add keyboard event listener for modal. Block game shortcuts from
        // leaking through, but let typing reach form fields inside the modal.
        this.keydownHandler = (e) => {
            const tag = (e.target?.tagName || '').toLowerCase();
            const isField = tag === 'input' || tag === 'textarea' || tag === 'select';

            // Enter submits (except in a textarea, where it inserts a newline).
            if (e.key === 'Enter' && tag !== 'textarea') {
                const continueButton = this.element.querySelector('.continue-button, [data-action="continue"]');
                if (continueButton) {
                    e.preventDefault();
                    continueButton.click();
                    return;
                }
            }

            if (!isField) {
                e.stopPropagation();
                e.preventDefault();
            }
        };
    }

    show(newContent = null) {
        if (this.element) {
            this.element.style.display = 'flex';
            if (newContent) {
                this.element.querySelector('.modal-content').innerHTML = newContent;
            }
            // Add keyboard event listener to block other events
            document.addEventListener('keydown', this.keydownHandler, true);
        } else {
            console.error('Modal not found');
        }
        return new Promise((resolve, reject) => {
            // Store resolve function to call from button handlers
            this._resolve = resolve;
        });
    }

    static async loadStyles() {
        if (Modal.stylesLoaded) return;
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = CSS_PATH;
        document.head.appendChild(link);
        
        Modal.stylesLoaded = true;
    }

    defaultButtons() {
        return [
            { text: 'Cancel', handler: () => {
                this.onCancel(); 
                this.hide();
                if (this._resolve) this._resolve(false);
            }},
            { 
                text: 'Continue', 
                class: 'continue-button',
                handler: () => {
                this.onContinue(); 
                this.hide();
                if (this._resolve) this._resolve(true);
            }}
        ];
    }

    // Overridable
    onCancel() { }
    onContinue() { }
}