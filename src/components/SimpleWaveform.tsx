"use client";
import { useEffect, useRef } from "react";

interface SimpleWaveformProps {
  audioUrl: string;
  isPlaying: boolean;
}

export default function SimpleWaveform({ audioUrl, isPlaying }: SimpleWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch and decode audio
  useEffect(() => {
    let cancelled = false;
    async function fetchAndDecode() {
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const res = await fetch(audioUrl);
        if (!res.ok) {
          throw new Error(`HTTP ${res.status} ${res.statusText}`);
        }
        const arrayBuffer = await res.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        if (!cancelled) {
          audioBufferRef.current = audioBuffer;
          drawWaveform(audioBuffer);
        }
      } catch (e: any) {
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            ctx.fillStyle = '#f87171';
            ctx.font = '12px sans-serif';
            const msg = e && e.message ? e.message : String(e);
            ctx.fillText('Could not load waveform', 10, 20);
            ctx.fillText(msg, 10, 36);
          }
        }
      }
    }
    fetchAndDecode();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line
  }, [audioUrl]);

  // Draw waveform
  function drawWaveform(audioBuffer: AudioBuffer) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { width, height } = canvas;
    const data = audioBuffer.getChannelData(0);
    const step = Math.ceil(data.length / width);
    const amp = height / 2;
    ctx.strokeStyle = '#f59e42';
    ctx.beginPath();
    for (let i = 0; i < width; i++) {
      let min = 1.0;
      let max = -1.0;
      for (let j = 0; j < step; j++) {
        const datum = data[(i * step) + j];
        if (datum < min) min = datum;
        if (datum > max) max = datum;
      }
      ctx.moveTo(i, (1 + min) * amp);
      ctx.lineTo(i, (1 + max) * amp);
    }
    ctx.stroke();
  }

  // Animate playhead
  useEffect(() => {
    if (!audioBufferRef.current) return;
    if (!isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      drawWaveform(audioBufferRef.current);
      return;
    }
    let start = performance.now();
    let duration = audioBufferRef.current.duration;
    function animate() {
      if (!canvasRef.current || !audioBufferRef.current) return;
      drawWaveform(audioBufferRef.current);
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      const { width, height } = canvasRef.current;
      const elapsed = ((performance.now() - start) / 1000) % duration;
      const x = (elapsed / duration) * width;
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      animationRef.current = requestAnimationFrame(animate);
    }
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      width={180}
      height={32}
      style={{ width: 180, height: 32, display: 'block' }}
    />
  );
}
