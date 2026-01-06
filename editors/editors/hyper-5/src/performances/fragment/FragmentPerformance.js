import { SynonymSentenceReader } from '../../readers/SynonymSentenceReader.js';

export class FragmentPerformance {
    constructor(params = {}) {
        this.params = { 
            overlayCount: 8,
            innerPointCount: 1, // number of interior points (triangles are randomly assigned to one)
            centerJitter: 0, 
            edgeColor: 'rgba(255, 255, 255, 0.2)',
            cornerPauseMs: 3000,  // How long points pause at corners (ms)
            fontSize: 16,
            fontFamily: 'SquareAntiqua',
            ...params 
        };
        
        this.state = {
            // We shatter the surface using:
            // - Static points on the border (do NOT animate)
            // - One or more points in the center (static)
            // Each overlay layer uses one triangle derived from these points (a true shared-edge shatter).
            borderPoints: [],
            centerPoints: [],
            triangles: []
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
        const manager = new TriangleManager({
            triangleCount: this.params.overlayCount,
            innerPointCount: this.params.innerPointCount,
            edgeToXY: this.edgeToXY.bind(this),
        });

        const { borderPoints, centerPoints, triangles } = manager.generate();
        this.state.borderPoints = borderPoints;
        this.state.centerPoints = centerPoints;
        this.state.triangles = triangles;
    }
    
    /**
     * Get the 3 points for a given triangle index
     */
    getTrianglePoints(triangleIndex) {
        if (!this.state.triangles?.length) return [];
        return this.state.triangles[triangleIndex % this.state.triangles.length];
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
        this.editor.addEventListener('mousemove', (event) => this.onMouseMove(event));
        console.log('initialized');

        // Initial update
        this.syncEditorStyles();
        this.updateClipPaths();
        this.updateOverlayText();
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

    updateClipPaths() {
        if (!this.svg) return;
        
        const width = this.svg.clientWidth;
        const height = this.svg.clientHeight;

        // Update each layer's clip path
        for (let i = 0; i < this.params.overlayCount; i++) {
            const [point1, point2, point3] = this.getTrianglePoints(i);
            if (!point1 || !point2 || !point3) continue;
            
            // Points are already stored in percent space (0..100)
            const p1 = { x: point1.x, y: point1.y };
            const p2 = { x: point2.x, y: point2.y };
            const p3 = { x: point3.x, y: point3.y };
            
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

        // Animate on keystrokes by jittering the interior points, then re-render triangles.
        this.updateCenterPointLocationBasedOnCaret();
        this.updateClipPaths();
        
        this.updateOverlayText();
    }

    async onMouseMove(event) {
        const { clientX, clientY } = event;
        const x = clientX;
        const y = clientY;
        this.updateCenterPointLocationBasedOnMouseMove(x, y);

        this.updateClipPaths();
    }

    updateCenterPointLocationBasedOnCaret() {
        const radius = Number(this.params.centerJitter) || 0;
        const svgRect = this.svg.getBoundingClientRect();
        if (!svgRect.width || !svgRect.height) return;
        let cxClient;
        let cyClient;

        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
            const caretRange = selection.getRangeAt(0).cloneRange();
            caretRange.collapse(false);

            let caretRect = caretRange.getBoundingClientRect();
            if ((!caretRect || (caretRect.width === 0 && caretRect.height === 0)) && caretRange.getClientRects) {
                const caretRects = caretRange.getClientRects();
                if (caretRects.length) caretRect = caretRects[0];
            }

            if (caretRect && (caretRect.width > 0 || caretRect.height > 0)) {
                cxClient = caretRect.left;
                cyClient = caretRect.top + caretRect.height / 2;
            }
        }

        if (cxClient === undefined || cyClient === undefined) {
            const editorRect = this.editor.getBoundingClientRect();
            cxClient = editorRect.left + 1;
            cyClient = editorRect.top + 1;
        }

        const caretX = ((cxClient - svgRect.left) / svgRect.width) * 100;
        const caretY = ((cyClient - svgRect.top) / svgRect.height) * 100;

        const radiusX = svgRect.width * radius / 100;
        const radiusY = svgRect.height * radius / 100;

        for (const p of this.state.centerPoints) {
            p.x = Math.max(0, Math.min(100, caretX + (Math.random() * 2 - 1) * radiusX));
            p.y = Math.max(0, Math.min(100, caretY + (Math.random() * 2 - 1) * radiusY));
        }
    }

    updateCenterPointLocationBasedOnMouseMove(x, y) {
        const svgRect = this.svg?.getBoundingClientRect();
        if (!svgRect?.width || !svgRect?.height) return;

        const mouseX = ((x - svgRect.left) / svgRect.width) * 100;
        const mouseY = ((y - svgRect.top) / svgRect.height) * 100;

        const offsets = [-5, -10];

        const clampedX = Math.max(0, Math.min(100, mouseX)) + offsets[0];
        const clampedY = Math.max(0, Math.min(100, mouseY)) + offsets[1];

        for (const p of this.state.centerPoints) {
            p.x = clampedX;
            p.y = clampedY;
        }
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

class TriangleManager {
    constructor({ triangleCount, innerPointCount, edgeToXY }) {
        this.triangleCount = Math.max(1, triangleCount || 1);
        this.innerPointCount = Math.max(1, innerPointCount || 1);
        this.edgeToXY = edgeToXY;
    }

    generate() {
        const centerPoints = Array.from({ length: this.innerPointCount }, () => this.generateCenterPoint());

        // Start with 4 triangles: one per side of the editor, all connected to the same center point.
        // Then, for each additional triangle, pick a random border segment and insert a new border point on it.
        // This splits the corresponding triangle into two, preserving a true shared-edge shatter.
        const borderPoints = [
            { kind: 'border', x: 0, y: 0 },       // top-left
            { kind: 'border', x: 100, y: 0 },     // top-right
            { kind: 'border', x: 100, y: 100 },   // bottom-right
            { kind: 'border', x: 0, y: 100 },     // bottom-left
        ];

        while (borderPoints.length < Math.max(3, this.triangleCount)) {
            this.insertBorderPoint(borderPoints);
        }

        const triangles = borderPoints.map((p, i) => {
            const centerPoint = centerPoints[Math.floor(Math.random() * centerPoints.length)];
            return [
                p,
                borderPoints[(i + 1) % borderPoints.length],
                centerPoint
            ];
        });

        return { borderPoints, centerPoints, triangles };
    }

    generateCenterPoint() {
        return {
            kind: 'center',
            // keep away from edges so the shatter reads clearly
            x: 20 + Math.random() * 60,
            y: 20 + Math.random() * 60,
        };
    }

    insertBorderPoint(borderPoints) {
        const len = borderPoints.length;
        const i = Math.floor(Math.random() * len);
        const j = (i + 1) % len;
        const a = borderPoints[i];
        const b = borderPoints[j];

        const p = this.pointOnBorderSegment(a, b);
        if (!p) return;

        // Insert between a and b in the cyclic border list
        if (j === 0) {
            borderPoints.push(p);
        } else {
            borderPoints.splice(j, 0, p);
        }
    }

    pointOnBorderSegment(a, b) {
        // Segment should lie on one of the rectangle edges (axis-aligned in percent space).
        // We rely on exact coordinates since we only ever generate points on edges.
        const min = (u, v) => Math.min(u, v);
        const max = (u, v) => Math.max(u, v);

        // top edge
        if (a.y === 0 && b.y === 0) {
            return { kind: 'border', x: min(a.x, b.x) + Math.random() * (max(a.x, b.x) - min(a.x, b.x)), y: 0 };
        }
        // right edge
        if (a.x === 100 && b.x === 100) {
            return { kind: 'border', x: 100, y: min(a.y, b.y) + Math.random() * (max(a.y, b.y) - min(a.y, b.y)) };
        }
        // bottom edge
        if (a.y === 100 && b.y === 100) {
            return { kind: 'border', x: min(a.x, b.x) + Math.random() * (max(a.x, b.x) - min(a.x, b.x)), y: 100 };
        }
        // left edge
        if (a.x === 0 && b.x === 0) {
            return { kind: 'border', x: 0, y: min(a.y, b.y) + Math.random() * (max(a.y, b.y) - min(a.y, b.y)) };
        }

        // Not a border segment (shouldn't happen with our construction)
        return null;
    }
}
