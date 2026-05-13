import { useState, useEffect, useRef } from 'react';

function formatTime(secs) {
  if (!isFinite(secs)) return '–:––';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function AudioPlayer({ src, isActive }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isActive) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isActive]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => { if (!dragging) setCurrentTime(audio.currentTime); };
    const onDurationChange = () => setDuration(audio.duration);
    const onEnded = () => setPlaying(false);

    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('durationchange', onDurationChange);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('durationchange', onDurationChange);
      audio.removeEventListener('ended', onEnded);
    };
  }, [dragging]);

  // spacebar to play/pause when active
  useEffect(() => {
    if (!isActive) return;
    const onKey = (e) => {
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isActive, playing]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    playing ? audio.pause() : audio.play().catch(() => {});
  }

  function seek(e) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    audio.currentTime = val;
  }

  const progress = duration ? currentTime / duration : 0;

  return (
    <div className="audio-player-custom">
      <audio ref={audioRef} src={src} preload="metadata" />

      <button className="ap-play" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <rect x="5" y="4" width="4" height="16" rx="1"/>
            <rect x="15" y="4" width="4" height="16" rx="1"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5.14v14l11-7-11-7z"/>
          </svg>
        )}
      </button>

      <span className="ap-time ap-time--current">{formatTime(currentTime)}</span>

      <div className="ap-scrubber-wrap">
        <div className="ap-track">
          <div className="ap-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <input
          className="ap-scrubber"
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={currentTime}
          onMouseDown={() => setDragging(true)}
          onTouchStart={() => setDragging(true)}
          onMouseUp={() => setDragging(false)}
          onTouchEnd={() => setDragging(false)}
          onChange={seek}
          aria-label="Seek"
        />
      </div>

      <span className="ap-time ap-time--duration">{formatTime(duration)}</span>
    </div>
  );
}
