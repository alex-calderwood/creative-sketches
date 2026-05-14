import { useState, useEffect, useRef } from 'react';
import { useHorizontalPageNav } from '../hooks/useHorizontalPageNav.js';
import { useVerticalWheelForward } from '../hooks/useVerticalWheelForward.js';
import CardFooter from './CardFooter.jsx';
import * as pdfjsLib from 'pdfjs-dist';
import { getGetLost } from '../storage.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function PdfCard({ item, isActive }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const containerRef = useRef(null);
  const canvasRefs = useRef([]);
  const pdfRef = useRef(null);

  const { pageIdx, setPageIdx, onScroll } = useHorizontalPageNav(containerRef, pages.length, isActive, item.pdfUrl);
  useVerticalWheelForward(containerRef, !loading);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setPages([]);

    const proxyUrl = `/api/pdf-proxy?url=${encodeURIComponent(item.pdfUrl)}`;
    let cancelled = false;
    const task = pdfjsLib.getDocument({
      url: proxyUrl,
      cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist/cmaps/',
      cMapPacked: true,
    });

    task.promise.then(pdf => {
      if (cancelled) return;
      pdfRef.current = pdf;
      const pageNums = Array.from({ length: pdf.numPages }, (_, i) => i + 1);
      setPages(pageNums);
      if (getGetLost() && pdf.numPages > 1) {
        setPageIdx(Math.floor(Math.random() * pdf.numPages));
      }
      setLoading(false);
    }).catch(err => {
      if (cancelled) return;
      console.error('[PdfCard] pdfjs failed:', err.message, '\n  pdfUrl:', item.pdfUrl, '\n  proxyUrl:', proxyUrl);
      setError(err.message);
      setLoading(false);
    });

    return () => { cancelled = true; task.destroy?.(); };
  }, [item.pdfUrl]);

  async function renderPage(pageNum, canvas) {
    if (!pdfRef.current || !canvas) return;
    const page = await pdfRef.current.getPage(pageNum);
    const base = page.getViewport({ scale: 1 });
    const dpr = window.devicePixelRatio || 1;
    const containerW = canvas.parentElement?.clientWidth || window.innerWidth;
    const containerH = canvas.parentElement?.clientHeight || window.innerHeight;
    const scale = Math.min(containerW / base.width, containerH / base.height) * dpr;
    const scaled = page.getViewport({ scale });

    canvas.width = scaled.width;
    canvas.height = scaled.height;
    canvas.style.width = `${scaled.width / dpr}px`;
    canvas.style.height = `${scaled.height / dpr}px`;

    await page.render({ canvasContext: canvas.getContext('2d'), viewport: scaled }).promise;
  }

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
            <canvas ref={el => { canvasRefs.current[i] = el; }} />
          </div>
        ))}
      </div>
      <CardFooter
        pageIdx={pageIdx}
        numPages={pages.length}
        onPrev={() => setPageIdx(i => Math.max(i - 1, 0))}
        onNext={() => setPageIdx(i => Math.min(i + 1, pages.length - 1))}
        sourceUrl={item.sourceUrl}
      />
    </div>
  );
}
