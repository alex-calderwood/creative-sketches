import AudioPlayer from './AudioPlayer.jsx';

export default function AudioCard({ item, isActive }) {
  return (
    <div className="audio-card">
      <div className="audio-visual">
        <div className="audio-waveform">
          {Array.from({ length: 32 }).map((_, i) => (
            <div
              key={i}
              className="audio-bar"
              style={{ animationDelay: `${(i * 0.05) % 0.8}s` }}
            />
          ))}
        </div>
        {item.trackTitle && (
          <div className="audio-track-title">{item.trackTitle}</div>
        )}
      </div>
      <AudioPlayer src={item.mediaUrl} isActive={isActive} />
    </div>
  );
}
