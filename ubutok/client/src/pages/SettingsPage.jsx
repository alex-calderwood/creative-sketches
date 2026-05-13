import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getHistory, clearHistory, getEnabledCategories, setEnabledCategories } from '../storage.js';
import { fetchCategories } from '../api.js';
import './SettingsPage.css';

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function SettingsPage() {
  const [categories, setCategories] = useState([]);
  const [enabled, setEnabled] = useState(null); // null = all
  const [history, setHistory] = useState([]);

  useEffect(() => {
    fetchCategories().then(cats => {
      setCategories(cats);
      const stored = getEnabledCategories();
      setEnabled(stored ?? cats.map(c => c.key));
    });
    setHistory(getHistory());
  }, []);

  function toggle(key) {
    setEnabled(prev => {
      const next = prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key];
      // Always keep at least one enabled
      const safe = next.length === 0 ? [key] : next;
      setEnabledCategories(safe);
      return safe;
    });
  }

  function handleClearHistory() {
    clearHistory();
    setHistory([]);
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <Link to="/" className="settings-back">← Feed</Link>
        <span className="settings-title">UbuTok</span>
      </header>

      <div className="settings-body">

        <section className="settings-section">
          <div className="privacy-notice">
            <span className="privacy-icon">🔒</span>
            <div>
              <strong>Your data stays in your browser.</strong>
              <p>
                Settings and history are stored using <code>localStorage</code> — a browser API
                that keeps data on your device only. None of this is sent to or stored on
                the server.
              </p>
            </div>
          </div>
        </section>

        <section className="settings-section">
          <h2 className="settings-section-title">Content Sources</h2>
          <p className="settings-hint">Choose which sections of UbuWeb to draw from.</p>
          <div className="category-toggles">
            {categories.map(cat => (
              <label key={cat.key} className="category-toggle">
                <span className="toggle-label">{cat.label}</span>
                <button
                  role="switch"
                  aria-checked={enabled?.includes(cat.key)}
                  className={`toggle-switch ${enabled?.includes(cat.key) ? 'toggle-switch--on' : ''}`}
                  onClick={() => toggle(cat.key)}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-header">
            <h2 className="settings-section-title">History</h2>
            {history.length > 0 && (
              <button className="clear-btn" onClick={handleClearHistory}>Clear</button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="settings-hint">Nothing watched yet.</p>
          ) : (
            <ul className="history-list">
              {history.map(item => (
                <li key={item.id} className="history-item">
                  <div className="history-meta">
                    <span className="history-badge">{item.categoryLabel}</span>
                    <span className="history-date">{formatDate(item.seenAt)}</span>
                  </div>
                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="history-title"
                  >
                    {item.title}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="settings-section">
          <Link to="/debug" className="debug-link">Scraper debug →</Link>
        </section>

      </div>
    </div>
  );
}
