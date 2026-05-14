export default function CardFooter({ pageIdx, numPages, onPrev, onNext, sourceUrl }) {
  return (
    <div className="card-footer">
      <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className="card-footer-link">
        View on UbuWeb ↗
      </a>
      <div className="card-footer-nav">
        <button className="card-footer-btn" onClick={onPrev} disabled={pageIdx === 0}>←</button>
        <span className="card-footer-count">{pageIdx + 1} / {numPages}</span>
        <button className="card-footer-btn" onClick={onNext} disabled={pageIdx === numPages - 1}>→</button>
      </div>
    </div>
  );
}
