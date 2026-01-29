
export class Modal {
    static defaultButtons = [
        { text: 'Cancel', handler: () => Modal.hide() },
        { text: 'Continue', handler: () => Modal.hide() }
    ];
    
    static templateHTML = null;
    static stylesLoaded = false;

    constructor(id, content = '', buttons = Modal.defaultButtons) {
        this.id = id;
        this.content = content;
        this.buttons = buttons;
        this.element = null;
    }

    static hide() {
        if (this.element) {
            this.element.style.display = 'none';
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
        const buttonHTML = this.buttons.map(btn => 
            `<button data-action="${btn.text.toLowerCase()}">${btn.text}</button>`
        ).join('');
        
        this.element.innerHTML = `
            <div class="modal-content">
                ${this.content}
                <div class="modal-buttons">${buttonHTML}</div>
            </div>
        `;
        
        // Attach to DOM
        document.body.appendChild(this.element);
        
        // Add event listeners
        this.buttons.forEach(btn => {
            const button = this.element.querySelector(`[data-action="${btn.text.toLowerCase()}"]`);
            if (button && btn.handler) {
                button.addEventListener('click', btn.handler);
            }
        });
    }

    show() {
        if (this.element) {
            this.element.style.display = 'flex';
        }
    }

    static async loadStyles() {
        if (Modal.stylesLoaded) return;
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/editors/drifts/Modal.css';
        document.head.appendChild(link);
        
        Modal.stylesLoaded = true;
    }
}