import { useState } from 'react';

export default function ImageCard({ item }) {
  const images = item.allImages?.length ? item.allImages : [item.mediaUrl];
  const [idx, setIdx] = useState(0);

  function next(e) {
    e.stopPropagation();
    setIdx(i => (i + 1) % images.length);
  }

  function prev(e) {
    e.stopPropagation();
    setIdx(i => (i - 1 + images.length) % images.length);
  }

  return (
    <div className="image-card">
      <img
        key={images[idx]}
        src={images[idx]}
        alt={item.title}
        className="image-display"
      />
      {images.length > 1 && (
        <div className="image-nav">
          <button className="image-nav-btn" onClick={prev}>‹</button>
          <span className="image-nav-count">{idx + 1} / {images.length}</span>
          <button className="image-nav-btn" onClick={next}>›</button>
        </div>
      )}
    </div>
  );
}
