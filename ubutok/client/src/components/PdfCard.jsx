import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function PdfCard({ item, isActive }) {
  const [pages, setPages] = useState([]);
  const [numPages, setNumPages] = useState(0);
  const [pageIdx, setPageIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const canvasRefs = useRef([]);
  const pdfRef = useRef(null);
  const renderingRef = useRef(false);

  // Load PDF document
  useEffect(() => {
    setLoading(true);
    setError(null);
    setPages([]);
    setPageIdx(0);

    const proxyUrl = `/api/pdf-proxy?url=${encodeURIComponent(item.pdfUrl)}`;
    const task = pdfjsLib.getDocument({
      url: proxyUrl,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist/cmaps/',
      cMapPacked: true,
    });

    task.promise.then(pdf => {
      pdfRef.current = pdf;
      setNumPages(pdf.numPages);
      setPages(Array.from({ length: pdf.numPages }, (_, i) => i + 1));
      setLoading(false);
    }).catch(err => {
      setError(err.message);
      setLoading(false);
    });

    return () => task.destroy?.();
  }, [item.pdfUrl]);

  // Render a single page into its canvas
  async function renderPage(pageNum, canvas) {
    if (!pdfRef.current || !canvas) return;
    const page = await pdfRef.current.getPage(pageNum);
    const viewport = page.getViewport({ scale: window.devicePixelRatio || 1 });
    const containerW = canvas.parentElement?.clientWidth || window.innerWidth;
    const scale = (containerW / viewport.width) * (window.devicePixelRatio || 1);
    const scaled = page.getViewport({ scale });

    canvas.width = scaled.width;
    canvas.height = scaled.height;
    canvas.style.width = `${containerW}px`;
    canvas.style.height = `${scaled.height / (window.devicePixelRatio || 1)}px`;

    await page.render({ canvasContext: canvas.getContext('2d'), viewport: scaled }).promise;
  }

  // Render visible + adjacent pages when pageIdx changes
  useEffect(() => {
    if (!pages.length) return;
    const toRender = new Set([pageIdx, pageIdx - 1, pageIdx + 1].filter(i => i >= 0 && i < pages.length));
    toRender.forEach(i => {
      const canvas = canvasRefs.current[i];
      if (canvas && !canvas.dataset.rendered) {
        renderPage(pages[i], canvas).then(() => { canvas.dataset.rendered = '1'; });
      }
    });
  }, [pageIdx, pages]);

  // Scroll container to page
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ left: pageIdx * el.clientWidth, behavior: 'smooth' });
  }, [pageIdx]);

  // Sync pageIdx from scroll
  function onScroll() {
    const el = containerRef.current;
    if (!el) return;
    setPageIdx(Math.round(el.scrollLeft / el.clientWidth));
  }

  // Keyboard nav when active
  useEffect(() => {
    if (!isActive) return;
    function onKey(e) {
      if (e.key === 'ArrowRight') setPageIdx(i => Math.min(i + 1, numPages - 1));
      if (e.key === 'ArrowLeft')  setPageIdx(i => Math.max(i - 1, 0));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isActive, numPages]);

  if (loading) return (
    <div className="pdf-card pdf-card--loading">
      <div className="spinner" />
      <span>Loading PDF…</span>
    </div>
  );

  if (error) return (
    <div className="pdf-card pdf-card--error">
      <p>Failed to load PDF</p>
      <a href={item.pdfUrl} target="_blank" rel="noopener noreferrer">Open directly ↗</a>
    </div>
  );

  return (
    <div className="pdf-card">
      <div className="pdf-pages" ref={containerRef} onScroll={onScroll}>
        {pages.map((pageNum, i) => (
          <div className="pdf-page" key={i}>
            <canvas
              ref={el => { canvasRefs.current[i] = el; }}
            />
          </div>
        ))}
      </div>

      <div className="pdf-footer">
        <button
          className="text-page-btn"
          onClick={() => setPageIdx(i => Math.max(i - 1, 0))}
          disabled={pageIdx === 0}
        >←</button>
        <span className="text-page-count">{pageIdx + 1} / {numPages}</span>
        <button
          className="text-page-btn"
          onClick={() => setPageIdx(i => Math.min(i + 1, numPages - 1))}
          disabled={pageIdx === numPages - 1}
        >→</button>
        <a href={item.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-page-source">
          PDF ↗
        </a>
      </div>
    </div>
  );
}
