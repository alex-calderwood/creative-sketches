import { useState, useEffect, useRef } from 'react';

export function useHorizontalPageNav(containerRef, numPages, isActive, resetKey) {
  const [pageIdx, setPageIdx] = useState(0);
  const programmaticRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    programmaticRef.current = true;
    el.scrollTo({ left: pageIdx * el.clientWidth, behavior: 'smooth' });
    const timer = setTimeout(() => { programmaticRef.current = false; }, 400);
    return () => clearTimeout(timer);
  }, [pageIdx, containerRef]);

  function onScroll() {
    if (programmaticRef.current) return;
    const el = containerRef.current;
    if (!el) return;
    setPageIdx(Math.round(el.scrollLeft / el.clientWidth));
  }

  useEffect(() => {
    if (!isActive) return;
    function onKey(e) {
      if (e.key === 'ArrowRight') setPageIdx(i => Math.min(i + 1, numPages - 1));
      if (e.key === 'ArrowLeft')  setPageIdx(i => Math.max(i - 1, 0));
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isActive, numPages]);

  useEffect(() => { setPageIdx(0); }, [resetKey]);

  return { pageIdx, setPageIdx, onScroll };
}
