import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { getGetLost } from '../storage.js';

export default function VideoCard({ item, isActive }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !item.mediaUrl) return;

    const isHls = item.mediaUrl.includes('.m3u8');

    if (isHls && Hls.isSupported()) {
      const hls = new Hls();
      hlsRef.current = hls;
      hls.loadSource(item.mediaUrl);
      hls.attachMedia(video);
    } else {
      video.src = item.mediaUrl;
    }

    if (getGetLost()) {
      const onMeta = () => {
        if (video.duration && isFinite(video.duration)) {
          video.currentTime = Math.random() * video.duration * 0.9;
        }
      };
      video.addEventListener('loadedmetadata', onMeta, { once: true });
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.src = '';
    };
  }, [item.mediaUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [isActive]);

  return (
    <video
      ref={videoRef}
      className="media-player video-player"
      controls
      playsInline
      loop
      muted={false}
    />
  );
}
