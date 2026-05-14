import { useEffect, useRef } from 'react';
import AudioPlayer from './AudioPlayer.jsx';
import { getGetLost } from '../storage.js';

export default function AudioCard({ item, isActive }) {
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const dataArrayRef = useRef(null);
  const audioCtxRef = useRef(null);
  const frameRef = useRef(null);

  const proxyUrl = `/api/audio-proxy?url=${encodeURIComponent(item.mediaUrl)}`;

  function onMount(audioEl) {
    if (!audioEl || audioCtxRef.current) return;
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      analyser.smoothingTimeConstant = 0.8;
      ctx.createMediaElementSource(audioEl).connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      dataArrayRef.current = new Uint8Array(analyser.fftSize);
      // AudioContext starts suspended until user gesture
      audioEl.addEventListener('play', () => ctx.resume(), { once: false });
    } catch {
      // CORS or API unavailable — spiral will animate without audio data
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    function draw() {
      frameRef.current = requestAnimationFrame(draw);
      const W = canvas.width = canvas.offsetWidth;
      const H = canvas.height = canvas.offsetHeight;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, W, H);

      const analyser = analyserRef.current;
      const data = dataArrayRef.current;
      if (analyser && data) analyser.getByteTimeDomainData(data);

      // RMS amplitude → controls how far the spiral extends
      let rms = 0;
      if (data) {
        for (let i = 0; i < data.length; i++) rms += (data[i] - 128) ** 2;
        rms = Math.sqrt(rms / data.length) / 128; // 0–1
      }

      const cx = W / 2;
      const cy = H / 2;
      const maxR = Math.min(W, H) * 0.44;
      const N = data?.length ?? 512;
      // Spiral length: 1 turn at silence, up to 8 turns at loud
      const turns = 1 + rms * 25;

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 1;

      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const angle = t * turns * Math.PI * 2 - Math.PI / 2;
        const amp = data ? (data[i] - 128) / 128 : 0;
        const r = t * maxR + amp * maxR * 0.08;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    draw();
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  return (
    <div className="audio-card">
      <div className="audio-visual">
        <canvas ref={canvasRef} className="audio-spiral" />
        {item.trackTitle && <div className="audio-track-title">{item.trackTitle}</div>}
      </div>
      <AudioPlayer src={proxyUrl} isActive={isActive} onMount={onMount} getLost={getGetLost()} />
    </div>
  );
}
