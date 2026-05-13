import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Feed from './components/Feed.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import DebugPage from './pages/DebugPage.jsx';
import './App.css';

export default function App() {
  return (
    <BrowserRouter basename="/avantok">
      <Routes>
        <Route path="/" element={<FeedLayout />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/debug" element={<DebugPage />} />
      </Routes>
    </BrowserRouter>
  );
}

function FeedLayout() {
  return (
    <div className="app">
      <header className="app-header">
        <span className="app-logo">UbuTok</span>
        <Link to="/settings" className="app-settings-link" aria-label="Settings">
          ☰
        </Link>
      </header>
      <Feed />
    </div>
  );
}
