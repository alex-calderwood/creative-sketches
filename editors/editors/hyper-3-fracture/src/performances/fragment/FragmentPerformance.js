import { SynonymSentenceReader } from '../../readers/SynonymSentenceReader.js';

export class FragmentPerformance {
    constructor(params = {}) {
        this.params = { 
            overlayCount: 3,
            edgeColor: 'rgba(255, 255, 255, 0.8)',
            cornerPauseMs: 3000,  // How long points pause at corners (ms)
            baseVelocity: 0.1,
            fontSize: 16,
            fontFamily: 'SquareAntiqua',
            ...params 
        };
        
        this.state = {
            // Shared pool of points - each triangle uses 3 consecutive points (wrapping)
            // Triangle 0: points[0], points[1], points[2]
            // Triangle 1: points[1], points[2], points[3] (shares 2 with triangle 0)
            // Triangle n-1: points[n-1], points[0], points[1] (wraps back to share with triangle 0)
            // For n triangles, we have exactly n points (closed loop)
            points: []
        };
        
        this.editor = null;
        this.overlay = null;
        this.layers = [];         // Array of layer DOM elements
        this.glassOverlays = [];  // Array of glass overlay elements
        this.bottomLayer = null;  // The base layer showing original text
        this.svg = null;
        this.reader = null;
        this.animationId = null;
        
        // Initialize layer state with default positions
        this.initializeLayerState();
    }

    initializeLayerState() {
        // Create shared pool of points (closed loop)
        // For n triangles in a closed loop, we need exactly n+1 points
        // Triangle i uses: points[i], points[i+1], points[i+2] (with modulo wrapping)
        // This ensures each adjacent pair shares exactly 2 points
        // Example with 3 triangles, 4 points:
        //   T0: 0,1,2 | T1: 1,2,3 | T2: 2,3,0
        //   T0∩T1={1,2} | T1∩T2={2,3} | T2∩T0={0,2}
        const edges = ['top', 'right', 'bottom', 'left'];
        const pointCount = this.params.overlayCount + 1;
        
        for (let i = 0; i < pointCount; i++) {
            this.state.points.push({
                edge: edges[i % 4],
                pos: (i * (100 / pointCount)) % 100,  // Spread points evenly
                v: (Math.random() - 0.5) * this.params.baseVelocity,
                pauseUntil: 0  // Timestamp when pause ends (0 = not paused)
            });
        }
    }
    
    /**
     * Get the 3 points for a given triangle index (with wrapping for closed loop)
     * Triangle i uses points[i], points[(i+1) % n], points[(i+2) % n]
     */
    getTrianglePoints(triangleIndex) {
        const n = this.state.points.length;
        return [
            this.state.points[triangleIndex % n],
            this.state.points[(triangleIndex + 1) % n],
            this.state.points[(triangleIndex + 2) % n]
        ];
    }

    /**
     * Convert edge + position to x, y coordinates
     */
    edgeToXY(edge, pos) {
        switch (edge) {
            case 'top':    return { x: pos, y: 0 };
            case 'right':  return { x: 100, y: pos };
            case 'bottom': return { x: 100 - pos, y: 100 }; // reverse so movement is clockwise
            case 'left':   return { x: 0, y: 100 - pos };   // reverse so movement is clockwise
            default:       return { x: 0, y: 0 };
        }
    }

    initialize() {
        this.editor = document.getElementById('editor');
        this.overlay = document.getElementById('overlay');
        
        if (!this.editor || !this.overlay) return;

        // Set up the editor to be visible (not hidden)
        this.editor.classList.remove('text-hidden');

        // Build the fragment overlay structure
        this.buildOverlayStructure();
        
        // Initialize the synonym sentence reader
        this.reader = new SynonymSentenceReader('');

        // Set up event listeners
        this.editor.addEventListener('input', () => this.onEditorInput());

        // Initial update
        this.syncEditorStyles();
        this.updateClipPaths();
        this.updateOverlayText();
        
        // Start the animation loop
        this.startAnimation();
    }

    startAnimation() {
        const animate = () => {
            this.tick();
            this.animationId = requestAnimationFrame(animate);
        };
        animate();
    }

    stopAnimation() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    syncEditorStyles() {
        // Apply font params to editor
        this.editor.style.fontSize = `${this.params.fontSize}px`;
        this.editor.style.fontFamily = this.params.fontFamily;
        
        const editorStyles = window.getComputedStyle(this.editor);
        const textElements = this.overlay.querySelectorAll('.fragment-text');
        
        // Properties to copy from editor to overlay text
        const propertiesToCopy = [
            'fontFamily',
            'fontSize',
            'fontWeight',
            'fontStyle',
            'lineHeight',
            'letterSpacing',
            'wordSpacing',
            'textAlign',
            // 'color',
            'padding',
            'boxSizing'
        ];
        
        textElements.forEach(el => {
            propertiesToCopy.forEach(prop => {
                el.style[prop] = editorStyles[prop];
            });
        });
    }

    buildOverlayStructure() {
        // Clear existing overlay content
        this.overlay.innerHTML = '';

        // Create text wrapper
        const textWrapper = document.createElement('div');
        textWrapper.className = 'fragment-text-wrapper';
        
        // Create bottom layer (base layer showing original text, no clipping)
        this.bottomLayer = document.createElement('div');
        this.bottomLayer.className = 'fragment-layer';
        this.bottomLayer.style.zIndex = '0';
        this.bottomLayer.id = 'bottomLayer';
        
        const bottomText = document.createElement('div');
        bottomText.className = 'fragment-text bottom-text';
        this.bottomLayer.appendChild(bottomText);
        
        textWrapper.appendChild(this.bottomLayer);

        // Create n overlay layers (each with synonymized text, clipped to triangle)
        this.layers = [];
        this.glassOverlays = [];
        
        for (let i = 0; i < this.params.overlayCount; i++) {
            const layer = document.createElement('div');
            layer.className = 'fragment-layer';
            // Higher index = higher z-index (topmost layer is last)
            layer.style.zIndex = String(i + 1);
            layer.style.backgroundColor = 'var(--background-color)';
            layer.id = `layer-${i}`;
            layer.dataset.layerIndex = String(i);
            
            const layerText = document.createElement('div');
            layerText.className = 'fragment-text layer-text';
            layer.appendChild(layerText);
            
            // Glass overlay for this layer
            const glassOverlay = document.createElement('div');
            glassOverlay.className = 'glass-overlay';
            layer.appendChild(glassOverlay);
            
            textWrapper.appendChild(layer);
            this.layers.push(layer);
            this.glassOverlays.push(glassOverlay);
        }
        
        // Create control points layer (SVG for all control points)
        const controlPointsLayer = document.createElement('div');
        controlPointsLayer.className = 'control-points-layer';
        
        this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        this.svg.setAttribute('width', '100%');
        this.svg.setAttribute('height', '100%');
        
        // Create clip path visualization for each layer (no control points)
        for (let i = 0; i < this.params.overlayCount; i++) {
            // SVG path to visualize the triangle
            const clipPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            clipPath.id = `clipPath-${i}`;
            clipPath.setAttribute('fill', 'none');
            clipPath.setAttribute('stroke', this.params.edgeColor);
            clipPath.setAttribute('stroke-width', '1');
            clipPath.setAttribute('stroke-opacity', '0.5');
            this.svg.appendChild(clipPath);
        }
        
        controlPointsLayer.appendChild(this.svg);
        
        this.overlay.appendChild(textWrapper);
        this.overlay.appendChild(controlPointsLayer);
    }
    /**
     * Called each animation frame to update point positions
     */
    tick() {
        const now = performance.now();
        
        // Update each shared point's position along its edge
        for (const point of this.state.points) {
            // Skip if point is paused at a corner
            if (point.pauseUntil > now) {
                continue;
            }
            
            // Check if just coming out of a corner pause - assign new random velocity
            if (point.pauseUntil > 0 && point.pauseUntil <= now) {
                // Determine direction based on position (away from corner)
                const direction = point.pos <= 0 ? 1 : -1;
                point.v = direction * (0.5 + Math.random() * 0.5) * this.params.baseVelocity;
                point.pauseUntil = 0;  // Clear the pause
            }
            
            // Update position along edge
            point.pos += point.v;
            
            // Bounce at edge endpoints (0 and 100) and pause at corners
            if (point.pos <= 0 || point.pos >= 100) {
                point.pos = Math.max(0, Math.min(100, point.pos));
                // Start corner pause
                point.pauseUntil = now + this.params.cornerPauseMs;
            }
        }
        
        this.updateClipPaths();
    }

    updateClipPaths() {
        if (!this.svg) return;
        
        const width = this.svg.clientWidth;
        const height = this.svg.clientHeight;

        // Update each layer's clip path
        for (let i = 0; i < this.params.overlayCount; i++) {
            const [point1, point2, point3] = this.getTrianglePoints(i);
            
            // Convert edge+pos to x,y coordinates
            const p1 = this.edgeToXY(point1.edge, point1.pos);
            const p2 = this.edgeToXY(point2.edge, point2.pos);
            const p3 = this.edgeToXY(point3.edge, point3.pos);
            
            const clipPathEl = this.svg.querySelector(`#clipPath-${i}`);

            // Update the SVG path visualization
            if (clipPathEl) {
                const pathData = `M ${width * p1.x/100} ${height * p1.y/100} L ${width * p2.x/100} ${height * p2.y/100} L ${width * p3.x/100} ${height * p3.y/100} Z`;
                clipPathEl.setAttribute('d', pathData);
            }

            // Update CSS clip path for this layer
            const clipPath = `polygon(${p1.x}% ${p1.y}%, ${p2.x}% ${p2.y}%, ${p3.x}% ${p3.y}%)`;
            
            if (this.layers[i]) {
                this.layers[i].style.clipPath = clipPath;
            }
            if (this.glassOverlays[i]) {
                this.glassOverlays[i].style.clipPath = clipPath;
            }
        }

        // Bottom layer has no clipping
        if (this.bottomLayer) {
            this.bottomLayer.style.clipPath = 'none';
        }
    }

    async onEditorInput() {
        // Update the reader with the current editor text
        const editorText = this.editor.textContent || '';
        await this.reader.updateText(editorText);
        
        this.updateOverlayText();
    }

    updateOverlayText() {
        // Update each layer with its own synonymized text (using different synonym indices)
        for (let i = 0; i < this.params.overlayCount; i++) {
            const layerText = this.layers[i]?.querySelector('.layer-text');
            if (layerText) {
                // Each layer uses a different synonym index
                layerText.textContent = this.reader.getSynonymizedText(i);
            }
        }
        
        // Bottom layer shows the original text
        const bottomText = this.bottomLayer?.querySelector('.bottom-text');
        if (bottomText) {
            bottomText.textContent = this.reader.text;
        }
    }
}
