import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getHistory, clearHistory, getEnabledCategories, setEnabledCategories, getGetLost, setGetLost } from '../storage.js';
import { fetchCategories } from '../api.js';
import './SettingsPage.css';

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    + ' ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function SettingsPage() {
  const [categories, setCategories] = useState([]);
  const [enabled, setEnabled] = useState(null);
  const [history, setHistory] = useState([]);
  const [getLost, setGetLostState] = useState(getGetLost);

  useEffect(() => {
    document.querySelector('.settings-page')?.scrollTo(0, 0);
    fetchCategories().then(cats => {
      setCategories(cats);
      const stored = getEnabledCategories();
      setEnabled(stored ?? cats.map(c => c.key));
    });
    setHistory(getHistory());
  }, []);

  const allEnabled = enabled?.length === categories.length;

  function toggle(key) {
    setEnabled(prev => {
      const next = prev.includes(key)
        ? prev.filter(k => k !== key)
        : [...prev, key];
      const safe = next.length === 0 ? [key] : next;
      setEnabledCategories(safe);
      return safe;
    });
  }

  function toggleAll() {
    const next = allEnabled ? [categories[0]?.key].filter(Boolean) : categories.map(c => c.key);
    setEnabledCategories(next);
    setEnabled(next);
  }

  function toggleGetLost() {
    const next = !getLost;
    setGetLost(next);
    setGetLostState(next);
  }

  function handleClearHistory() {
    clearHistory();
    setHistory([]);
  }

  return (
    <div className="settings-page">
      <header className="settings-header">
        <Link to="/" className="settings-back">← back</Link>
        <span className="settings-title">UbuTok</span>
      </header>

      <div className="settings-body">

        <section className="settings-about">
          <p>
            I created <i>UbuTok</i> as a way to discover new art on{' '}
            <a href="https://www.ubu.com" target="_blank" rel="noopener noreferrer">UbuWeb</a>
            {' '}— a vast, independent archive of avant-garde art, film, sound, and text
            maintained since 1996 by Kenneth Goldsmith.
          </p>
          <p>
            UbuWeb hosts thousands of works: films, sound poetry, concrete poetry, outsider
            music, early net art, and more. UbuTok surfaces that material at random, one piece at a time. 
          </p>
          <p>
            All content is served directly from UbuWeb. This is an unofficial interface.
          </p>
        </section>


        <section className="settings-section">
          <div className="settings-section-header">
            <h2 className="settings-section-title">Playback</h2>
          </div>
          <div className="category-toggles">
            <label className="toggle-row">
              <span>Get Lost</span>
              <button
                role="switch"
                aria-checked={getLost}
                className={`toggle-switch ${getLost ? 'toggle-switch--on' : ''}`}
                onClick={toggleGetLost}
              >{getLost ? '[×]' : '[  ]'}</button>
            </label>
          </div>
          <p className="settings-notice" style={{ marginTop: 8 }}>
            Start audio and video at a random point. Open PDFs to a random page.
          </p>
        </section>

        <section className="settings-section">
          <div className="settings-section-header">
            <h2 className="settings-section-title">Sources</h2>
            <label className="toggle-row">
              <span className="toggle-all-label">{allEnabled ? 'all' : 'some'}</span>
              <button
                role="switch"
                aria-checked={allEnabled}
                className={`toggle-switch ${allEnabled ? 'toggle-switch--on' : ''}`}
                onClick={toggleAll}
              >{allEnabled ? '[×]' : '[  ]'}</button>
            </label>
          </div>
          <div className="category-toggles">
            {categories.map(cat => (
              <label key={cat.key} className="toggle-row">
                <span>{cat.label}</span>
                <button
                  role="switch"
                  aria-checked={enabled?.includes(cat.key)}
                  className={`toggle-switch ${enabled?.includes(cat.key) ? 'toggle-switch--on' : ''}`}
                  onClick={() => toggle(cat.key)}
                >{enabled?.includes(cat.key) ? '[×]' : '[  ]'}</button>
              </label>
            ))}
          </div>
        </section>

        <section className="settings-section">
          <div className="settings-section-header">
            <h2 className="settings-section-title">History</h2>
            {history.length > 0 && (
              <button className="clear-btn" onClick={handleClearHistory}>clear</button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="settings-empty">Nothing yet.</p>
          ) : (
            <ul className="history-list">
              {history.map(item => (
                <li key={item.id} className="history-item">
                  <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                    {item.title}
                  </a>
                  <span>{item.categoryLabel} — {formatDate(item.seenAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <p className="settings-notice">
          Settings and history are stored locally in your browser. Nothing is sent to the server.
        </p>

      </div>
    </div>
  );
}
