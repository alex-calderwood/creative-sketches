import { useRef } from 'react';
import { useHorizontalPageNav } from '../hooks/useHorizontalPageNav.js';
import { useVerticalWheelForward } from '../hooks/useVerticalWheelForward.js';
import CardFooter from './CardFooter.jsx';

const CHARS_PER_PAGE = 700;

function paginate(text) {
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
  return pages.length ? pages : [[]];
}

export default function TextCard({ item, isActive }) {
  const pages = paginate(item.text || '');
  const containerRef = useRef(null);
  const { pageIdx, setPageIdx, onScroll } = useHorizontalPageNav(containerRef, pages.length, isActive, item.sourceUrl);

  useVerticalWheelForward(containerRef);

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
