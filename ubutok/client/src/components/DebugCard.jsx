export default function DebugCard({ item }) {
  return (
    <div className="debug-fail-card">
      <div className="debug-fail-header">
        <span className="debug-fail-badge">{item.categoryLabel}</span>
        <span className="debug-fail-type">expected: {item.mediaType}</span>
      </div>
      <div className="debug-fail-reason">{item.reason}</div>
      <a
        href={item.indexUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="debug-fail-index"
      >
        index: {item.indexUrl}
      </a>
      <div className="debug-fail-tried-label">pages tried ({item.tried?.length ?? 0})</div>
      <ul className="debug-fail-tried">
        {item.tried?.map(url => (
          <li key={url}>
            <a href={url} target="_blank" rel="noopener noreferrer">
              {url.replace('https://ubuweb.com/', '')}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
