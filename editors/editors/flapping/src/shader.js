import * as THREE from "https://esm.sh/three@0.160.0";

const TEX = 2048;
const FONT_SIZE = 100;
const LINE_HEIGHT = 118;
const PADDING = 240;

export class ShaderLayer {
  constructor(container, editor) {
    this.container = container;
    this.editor = editor;

    this.texCanvas = document.createElement("canvas");
    this.texCanvas.width = TEX;
    this.texCanvas.height = TEX;
    this.tctx = this.texCanvas.getContext("2d");

    this.cursorBlink = true;
    setInterval(() => { this.cursorBlink = !this.cursorBlink; }, 530);

    this.scrollTopRow = 0;
    this.visualRows = [];
    this._raf = null;
    this._metrics = null;

    this.canvas = document.createElement("canvas");
    this.canvas.id = "shader-stage";
    container.appendChild(this.canvas);

    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(container);
  }

  _init(vertexShader) {
    const rect = this.container.getBoundingClientRect();
    const w = rect.width || 1;
    const h = rect.height || 1;

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
    this.camera.position.set(0, 0, 4.8);

    this.texture = new THREE.CanvasTexture(this.texCanvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.anisotropy = this.renderer.capabilities.getMaxAnisotropy();

    const geometry = new THREE.PlaneGeometry(3.2, 3.2, 192, 192);

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uTex: { value: this.texture },
      },
      vertexShader,
      fragmentShader: /* glsl */ `
        uniform sampler2D uTex;
        varying vec2 vUv;
        varying float vWarpHeight; // received from vertex shader (unused for now, available for effects)

        void main() {
          gl_FragColor = vec4(texture2D(uTex, vUv).rgb, 1.0);
        }
      `,
      side: THREE.DoubleSide,
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.scene.add(this.mesh);
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
  }

  _bindPointer() {
    let dragging = false;
    let dragAnchor = 0;

    this.canvas.addEventListener("pointerdown", (e) => {
      const pos = this._docPosFromPointer(e);
      if (pos === null) return;
      e.preventDefault();
      this.editor.focus();
      dragAnchor = pos;
      dragging = true;
      this.canvas.setPointerCapture(e.pointerId);
      this._setCaretRange(pos, pos);
    });

    this.canvas.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const pos = this._docPosFromPointer(e);
      if (pos === null) return;
      this._setCaretRange(dragAnchor, pos);
    });

    const endDrag = (e) => {
      if (!dragging) return;
      dragging = false;
      try { this.canvas.releasePointerCapture(e.pointerId); } catch {}
      this.editor.focus();
    };
    this.canvas.addEventListener("pointerup", endDrag);
    this.canvas.addEventListener("pointercancel", endDrag);
  }

  _docPosFromPointer(event) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(ndc, this.camera);
    const hits = this.raycaster.intersectObject(this.mesh);
    if (!hits.length || !hits[0].uv) return null;

    const uv = hits[0].uv;
    const px = uv.x * TEX;
    const py = (1 - uv.y) * TEX;
    if (!this.visualRows.length) return null;

    const { fontSize, lineHeight, padding, fontFamily } = this._metrics || {};
    const lh = lineHeight || LINE_HEIGHT;
    const pad = padding || PADDING;

    const rowOffset = Math.floor((py - pad) / lh);
    let rowIdx = this.scrollTopRow + rowOffset;
    rowIdx = Math.max(0, Math.min(rowIdx, this.visualRows.length - 1));
    const row = this.visualRows[rowIdx];

    this._setFont(row.style, fontFamily || this._readStyles().fontFamily);
    const targetX = Math.max(0, px - pad);
    let col = row.text.length;
    let prevW = 0;
    for (let i = 1; i <= row.text.length; i++) {
      const w = this.tctx.measureText(row.text.slice(0, i)).width;
      if (targetX < (prevW + w) / 2) { col = i - 1; break; }
      prevW = w;
    }
    return row.startDocPos + col;
  }

  // Walk the contenteditable DOM mirroring the same newline counting as
  // _getCaretInfo (block elements = \n, <br> = \n) to set a Range at offset.
  // Reverse of _walkDOM: given a character offset in the text it produces,
  // return a collapsed Range at that position in the DOM.
  // Reverse of _walkDOM: given a character offset in the text it produces,
  // return a collapsed Range at that position in the DOM.
  _rangeAtOffset(root, target) {
    const range = document.createRange();
    let pos = 0;
    let lastChar = '';  // mirrors _walkDOM's "text[text.length-1]" check
    let done = false;

    const walk = (node) => {
      if (done) return;
      if (node.nodeType === Node.TEXT_NODE) {
        const s = node.textContent;
        if (pos + s.length >= target) {
          range.setStart(node, target - pos);
          range.collapse(true);
          done = true;
          return;
        }
        pos += s.length;
        if (s.length) lastChar = s[s.length - 1];
        return;
      }
      if (node.nodeName === 'BR') {
        if (pos >= target) {
          range.setStart(node.parentNode, Array.from(node.parentNode.childNodes).indexOf(node));
          range.collapse(true);
          done = true;
          return;
        }
        pos += 1;
        lastChar = '\n';
        return;
      }
      const isBlock = node !== root && /^(DIV|P|LI|H[1-6]|BLOCKQUOTE)$/i.test(node.nodeName);
      if (isBlock && pos > 0 && lastChar !== '\n') {
        if (pos >= target) {
          range.setStart(node, 0);
          range.collapse(true);
          done = true;
          return;
        }
        pos += 1;
        lastChar = '\n';
      }
      let i = 0;
      for (const child of node.childNodes) {
        if (!done && pos === target) { range.setStart(node, i); range.collapse(true); done = true; return; }
        walk(child);
        i++;
      }
      if (!done && pos === target) { range.setStart(node, i); range.collapse(true); done = true; }
    };

    walk(root);
    if (!done) { range.selectNodeContents(root); range.collapse(false); }
    return range;
  }

  _setCaretRange(anchor, head) {
    const sel = window.getSelection();
    sel.removeAllRanges();
    const anchorRange = this._rangeAtOffset(this.editor, anchor);
    sel.addRange(anchorRange);
    if (anchor !== head) {
      const headRange = this._rangeAtOffset(this.editor, head);
      sel.extend(headRange.startContainer, headRange.startOffset);
    }
  }

  _resize() {
    const rect = this.container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (!w || !h) return;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  // --- Text layout helpers ---

  _readStyles() {
    const cs = getComputedStyle(this.editor);
    const bg = cs.backgroundColor || "#ffffff";
    const fg = cs.color || "#000000";
    const fontFamily = cs.fontFamily || "serif";
    const fgRgb = fg.match(/\d+/g) || ["0","0","0"];
    const selectionColor = `rgba(${fgRgb[0]},${fgRgb[1]},${fgRgb[2]},0.22)`;
    const bodyBg = getComputedStyle(document.body).backgroundColor || "#ffffff";
    // Scale DOM font size into texture-coordinate space so font size and
    // scale settings both affect the shader rendering.
    const domFontSize = parseFloat(cs.fontSize) || 16;
    const editorContainer = document.getElementById('editor-container');
    const cw = editorContainer?.getBoundingClientRect().width || 600;
    const fontSize = domFontSize * TEX / cw;
    const lineHeight = fontSize * 1.2;
    const padding = TEX * 0.11; // ~1 inch margin on 8.5" page
    return { bg, fg, fontFamily, selectionColor, bodyBg, fontSize, lineHeight, padding };
  }

  _lineStyle(text, fontSize) {
    const hd = /^(#{1,6})\s+/.exec(text);
    if (hd) return { weight: "700", style: "normal", size: Math.max(fontSize - (hd[1].length - 1) * (fontSize * 0.1), fontSize * 0.7), bar: false };
    if (/^```/.test(text)) return { weight: "400", style: "italic", size: fontSize, bar: false };
    if (/^>\s?/.test(text)) return { weight: "400", style: "normal", size: fontSize, bar: true };
    return { weight: "400", style: "normal", size: fontSize, bar: false };
  }

  _setFont(s, fontFamily) {
    this.tctx.font = `${s.style} ${s.weight} ${s.size}px ${fontFamily}`;
  }

  _wrapText(text, maxWidth) {
    if (!text) return [{ text: "", startCol: 0 }];
    const tokens = text.match(/\s+|\S+/g) || [];
    const segs = [];
    let segStart = 0, segText = "", pos = 0;
    for (const tok of tokens) {
      const test = segText + tok;
      if (this.tctx.measureText(test).width > maxWidth && segText.length > 0) {
        segs.push({ text: segText, startCol: segStart });
        segStart = pos;
        segText = tok;
      } else {
        segText = test;
      }
      pos += tok.length;
    }
    if (segText.length > 0 || !segs.length) segs.push({ text: segText, startCol: segStart });
    return segs;
  }

  _computeLayout(text, fontFamily, fontSize, padding) {
    const lines = text.split("\n");
    const rows = [];
    const maxWidth = TEX - 2 * padding;
    let docPos = 0;
    for (const lineText of lines) {
      const style = this._lineStyle(lineText, fontSize);
      this._setFont(style, fontFamily);
      const segs = this._wrapText(lineText, maxWidth);
      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        const startDocPos = docPos + seg.startCol;
        rows.push({
          text: seg.text,
          startDocPos,
          endDocPos: startDocPos + seg.text.length,
          style,
          isFirstInLine: i === 0,
          isLastInLine: i === segs.length - 1,
        });
      }
      docPos += lineText.length + 1; // +1 for \n
    }
    return rows;
  }

  _findCursorRow(rows, head) {
    let best = 0;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].startDocPos <= head && head <= rows[i].endDocPos) best = i;
      else if (rows[i].startDocPos > head) break;
    }
    return best;
  }

  // Use innerText for text content and range-cloned innerText for offsets
  // so both measurements use the same block-boundary newline semantics.
  // Single DOM walk that builds the text string and resolves caret offsets
  // using identical newline rules, eliminating innerText/range-clone mismatches.
  // Rules: block elem (not root) → '\n' before content if prev char isn't '\n';
  //        <br> → '\n'; text nodes → their content.
  _walkDOM() {
    const sel = window.getSelection();
    const focusNode  = sel?.focusNode;
    const focusOff   = sel?.focusOffset ?? 0;
    const anchorNode = sel?.anchorNode;
    const anchorOff  = sel?.anchorOffset ?? 0;
    const inEditor   = focusNode && this.editor.contains(focusNode);
    const root = this.editor;

    let text = '';
    let head = -1, anchor = -1;

    const check = (node, off, pos) => {
      if (node === focusNode  && off === focusOff)  head   = pos;
      if (node === anchorNode && off === anchorOff) anchor = pos;
    };

    const walk = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const s = node.textContent;
        const base = text.length;
        for (let i = 0; i <= s.length; i++) check(node, i, base + i);
        text += s;
        return;
      }
      if (node.nodeName === 'BR') {
        check(node, 0, text.length);
        text += '\n';
        return;
      }
      const isBlock = node !== root &&
        /^(DIV|P|LI|H[1-6]|BLOCKQUOTE)$/i.test(node.nodeName);
      if (isBlock && text.length > 0 && text[text.length - 1] !== '\n') {
        text += '\n';
      }
      let i = 0;
      for (const child of node.childNodes) {
        check(node, i++, text.length);
        walk(child);
      }
      check(node, i, text.length);
    };

    walk(root);

    if (head   === -1) head   = inEditor ? text.length : 0;
    if (anchor === -1) anchor = head;
    return { text, head, from: Math.min(head, anchor), to: Math.max(head, anchor) };
  }

  // --- Texture render ---

  _renderTexture() {
    const { bg, fg, fontFamily, selectionColor, bodyBg, fontSize, lineHeight, padding } = this._readStyles();
    // Cache metrics for _docPosFromPointer (called from pointer events)
    this._metrics = { fontSize, lineHeight, padding, fontFamily };

    const tctx = this.tctx;
    tctx.fillStyle = bg;
    tctx.fillRect(0, 0, TEX, TEX);

    tctx.strokeStyle = '#000000';
    tctx.lineWidth = 4;
    tctx.strokeRect(2, 2, TEX - 4, TEX - 4);

    const { text, head, from: selFrom, to: selTo } = this._walkDOM();
    this.visualRows = this._computeLayout(text, fontFamily, fontSize, padding);
    const hasRange = selFrom !== selTo;

    const cursorRowIdx = this._findCursorRow(this.visualRows, head);
    const visibleRowCount = Math.floor((TEX - 2 * padding) / lineHeight);

    if (cursorRowIdx < this.scrollTopRow) this.scrollTopRow = cursorRowIdx;
    if (cursorRowIdx >= this.scrollTopRow + visibleRowCount)
      this.scrollTopRow = cursorRowIdx - visibleRowCount + 1;
    if (this.scrollTopRow < 0) this.scrollTopRow = 0;

    tctx.textBaseline = "alphabetic";
    this.scene.background = new THREE.Color(bodyBg);

    let y = padding;
    for (let r = this.scrollTopRow; r < this.visualRows.length; r++) {
      const row = this.visualRows[r];
      const s = row.style;
      this._setFont(s, fontFamily);
      const baseline = y + s.size * 0.85;

      if (s.bar && row.isFirstInLine) {
        tctx.fillStyle = fg;
        tctx.fillRect(padding - 30, y + 8, 8, s.size - 16);
      }

      if (hasRange && selTo > row.startDocPos && selFrom <= row.endDocPos) {
        const startCol = Math.max(0, selFrom - row.startDocPos);
        const endCol = Math.min(row.text.length, selTo - row.startDocPos);
        const x1 = padding + tctx.measureText(row.text.slice(0, startCol)).width;
        const x2 = padding + tctx.measureText(row.text.slice(0, endCol)).width;
        const xEnd = selTo > row.endDocPos ? TEX - padding : Math.max(x2, x1 + 12);
        tctx.fillStyle = selectionColor;
        tctx.fillRect(x1, y + 4, xEnd - x1, s.size);
      }

      tctx.fillStyle = fg;
      tctx.fillText(row.text, padding, baseline);

      if (r === cursorRowIdx && this.cursorBlink) {
        const localCol = Math.min(Math.max(0, head - row.startDocPos), row.text.length);
        const wBefore = tctx.measureText(row.text.slice(0, localCol)).width;
        const cursorWidth = Math.max(2, fontSize * 0.04);
        tctx.fillStyle = fg;
        tctx.fillRect(padding + wBefore, y, cursorWidth, s.size);
      }

      y += lineHeight;
      if (y > TEX - padding) break;
    }
  }

  _tick() {
    this.material.uniforms.uTime.value = this.clock.getElapsedTime();
    this._renderTexture();
    this.texture.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
    this._raf = requestAnimationFrame(() => this._tick());
  }

  async start() {
    const url = new URL('./ripple.vert.glsl', import.meta.url);
    const vertexShader = await fetch(url).then(r => r.text());
    this._init(vertexShader);
    this._bindPointer();
    this._resize();
    this.editor.focus();
    this._tick();
  }

  destroy() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._ro.disconnect();
    this.renderer.dispose();
    this.canvas.remove();
  }
}
