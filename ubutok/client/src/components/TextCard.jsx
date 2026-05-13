import { useState, useRef, useEffect } from 'react';

const CHARS_PER_PAGE = 700;

function paginate(title, text) {
  const paragraphs = text.split(/\n+/).map(p => p.trim()).filter(Boolean);
  const pages = [];
  let current = [];
  let count = 0;

  for (const para of paragraphs) {
    current.push(para);
    count += para.length;
    if (count >= CHARS_PER_PAGE) {
      pages.push(current);
      current = [];
      count = 0;
    }
  }
  if (current.length) pages.push(current);

  // Put title on the first page
  return pages.length ? pages : [[]];
}

export default function TextCard({ item, isActive }) {
  const pages = paginate(item.title, item.text || '');
  const [pageIdx, setPageIdx] = useState(0);
  const containerRef = useRef(null);

  // Scroll to page when pageIdx changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ left: pageIdx * el.clientWidth, behavior: 'smooth' });
  }, [pageIdx]);

  // Sync pageIdx from scroll (swipe / drag)
  function onScroll() {
    const el = containerRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setPageIdx(idx);
  }

  // Keyboard nav when active
  useEffect(() => {
    if (!isActive) return;
    function onKey(e) {
      if (e.key === 'ArrowRight') setPageIdx(i => Math.min(i + 1, pages.length - 1));
      if (e.key === 'ArrowLeft')  setPageIdx(i => Math.max(i - 1, 0));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isActive, pages.length]);

  // Reset to page 0 when item changes
  useEffect(() => { setPageIdx(0); }, [item.sourceUrl]);

  return (
    <div className="text-card">
      <div className="text-pages" ref={containerRef} onScroll={onScroll}>
        {pages.map((paras, i) => (
          <div className="text-page" key={i}>
            {i === 0 && <h1 className="text-page-title">{item.title}</h1>}
            {paras.map((p, j) => <p key={j} className="text-page-para">{p}</p>)}
          </div>
        ))}
      </div>

      <div className="text-page-footer">
        <button
          className="text-page-btn"
          onClick={() => setPageIdx(i => Math.max(i - 1, 0))}
          disabled={pageIdx === 0}
        >←</button>
        <span className="text-page-count">{pageIdx + 1} / {pages.length}</span>
        <button
          className="text-page-btn"
          onClick={() => setPageIdx(i => Math.min(i + 1, pages.length - 1))}
          disabled={pageIdx === pages.length - 1}
        >→</button>
        <a
          href={item.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-page-source"
        >UbuWeb ↗</a>
      </div>
    </div>
  );
}
