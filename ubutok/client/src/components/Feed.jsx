import { useState, useEffect, useRef, useCallback } from 'react';
import MediaCard from './MediaCard.jsx';
import { fetchNext } from '../api.js';
import { addToHistory, getEnabledCategories } from '../storage.js';

const PRELOAD_THRESHOLD = 1;

function pickCategory() {
  const enabled = getEnabledCategories();
  if (!enabled || enabled.length === 0) return null;
  return enabled[Math.floor(Math.random() * enabled.length)];
}

export default function Feed() {
  const [items, setItems] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState(null);
  const feedRef = useRef(null);
  const fetchingRef = useRef(false);

  const loadNext = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setFetching(true);
    setError(null);
    try {
      const category = pickCategory();
      const item = await fetchNext(category);
      const stamped = { ...item, id: crypto.randomUUID() };
      setItems(prev => [...prev, stamped]);
      addToHistory(stamped);
    } catch (err) {
      setError(err.message);
    } finally {
      fetchingRef.current = false;
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    loadNext();
  }, [loadNext]);

  useEffect(() => {
    if (items.length - activeIndex <= PRELOAD_THRESHOLD) {
      loadNext();
    }
  }, [activeIndex, items.length, loadNext]);

  useEffect(() => {
    const feed = feedRef.current;
    if (!feed) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const idx = parseInt(entry.target.dataset.index, 10);
            setActiveIndex(idx);
          }
        });
      },
      { root: feed, threshold: 0.6 }
    );
    const cards = feed.querySelectorAll('.media-card');
    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [items]);

  return (
    <div className="feed" ref={feedRef}>
      {items.map((item, i) => (
        <MediaCard
          key={item.id}
          item={item}
          isActive={i === activeIndex}
          index={i}
        />
      ))}
      {error ? (
        <div className="feed-error">
          <p>Failed to load: {error}</p>
          <button onClick={loadNext}>Retry</button>
        </div>
      ) : fetching && (
        <div className="feed-loading feed-loading--card">
          <div className="spinner" />
        </div>
      )}
    </div>
  );
}
