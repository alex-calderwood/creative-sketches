import { useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCategories } from '../api.js';
import { useEffect } from 'react';
import './DebugPage.css';

export default function DebugPage() {
  const [categories, setCategories] = useState([]);
  const [selected, setSelected] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchCategories().then(cats => {
      setCategories(cats);
      setSelected(cats[0]?.key || '');
    });
  }, []);

  async function run() {
    if (!selected) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch(`/api/debug/${selected}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ success: false, log: [{ step: 'error', msg: err.message }] });
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="debug-page">
      <header className="debug-header">
        <Link to="/" className="debug-back">← Feed</Link>
        <span className="debug-title">Scraper Debug</span>
      </header>

      <div className="debug-body">
        <div className="debug-controls">
          <select
            className="debug-select"
            value={selected}
            onChange={e => setSelected(e.target.value)}
          >
            {categories.map(c => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
          <button className="debug-run-btn" onClick={run} disabled={running}>
            {running ? 'Scraping…' : 'Run Scrape'}
          </button>
        </div>

        {result && (
          <div className="debug-result">
            <div className={`debug-status ${result.success ? 'debug-status--ok' : 'debug-status--fail'}`}>
              {result.success ? '✓ Media found' : '✗ No media found'}
            </div>

            {result.success && result.result && (
              <div className="debug-found">
                <div className="debug-found-type">{result.result.type}</div>
                <div className="debug-found-title">{result.result.title}</div>
                <a href={result.result.mediaUrl} target="_blank" rel="noopener noreferrer" className="debug-found-url">
                  {result.result.mediaUrl}
                </a>
              </div>
            )}

            <div className="debug-log">
              {result.log.map((entry, i) => (
                <LogEntry key={i} entry={entry} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function LogEntry({ entry }) {
  const [open, setOpen] = useState(entry.step === 'error' || entry.step === 'failed');

  const stepColors = {
    category: '#6af',
    index: '#adf',
    page: entry.extracted ? '#6f6' : '#fa6',
    success: '#6f6',
    failed: '#f66',
    error: '#f66',
  };

  return (
    <div className="log-entry" style={{ '--step-color': stepColors[entry.step] || '#888' }}>
      <button className="log-entry-header" onClick={() => setOpen(o => !o)}>
        <span className="log-step">{entry.step}</span>
        <span className="log-summary">
          {entry.url && <span className="log-url">{entry.url.replace('https://ubuweb.com/', '')}</span>}
          {entry.title && <span className="log-title"> — {entry.title.slice(0, 60)}</span>}
          {entry.msg && <span className="log-msg"> {entry.msg}</span>}
          {entry.pagesFound !== undefined && <span> ({entry.pagesFound} pages)</span>}
          {entry.extracted && <span className="log-extracted"> → {entry.extracted.type}</span>}
          {entry.extracted === null && <span className="log-none"> → nothing extracted</span>}
        </span>
        <span className="log-chevron">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <pre className="log-body">{JSON.stringify(entry, null, 2)}</pre>
      )}
    </div>
  );
}
