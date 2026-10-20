'use client';

import { useEffect, useRef } from 'react';

const BAR_COUNT = 84;
const GREEN = '92, 192, 136';

// Fixed full-page audio-visualizer. It idles on its own and reacts to scrolling: the scroll
// position shifts the pattern, and scroll speed adds "energy" that lifts the bars and waves.
export default function VisualizerBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let width = 0;
    let height = 0;
    let raf = 0;
    let scrollY = window.scrollY;
    let lastScrollY = scrollY;
    let energy = 0;
    let pointerX = 0.5;
    let running = true;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const onScroll = () => { scrollY = window.scrollY; if (reduced) draw(0); };
    const onPointer = (e: PointerEvent) => { pointerX = e.clientX / Math.max(1, window.innerWidth); };

    function draw(time: number) {
      const t = time / 1000;
      const delta = scrollY - lastScrollY;
      lastScrollY = scrollY;
      energy += (Math.min(1, Math.abs(delta) / 40) - energy) * 0.08;
      const lift = 1 + energy * 1.1;
      const shift = scrollY * 0.006;

      ctx!.clearRect(0, 0, width, height);

      // Soft glows that drift with the scroll position
      const glow = (x: number, y: number, r: number, a: number) => {
        const g = ctx!.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(${GREEN}, ${a})`);
        g.addColorStop(1, `rgba(${GREEN}, 0)`);
        ctx!.fillStyle = g;
        ctx!.fillRect(x - r, y - r, r * 2, r * 2);
      };
      glow(width * 0.15, height * 0.2 - scrollY * 0.05, Math.max(width, height) * 0.45, 0.09 + energy * 0.04);
      glow(width * 0.9, height * 0.85 + scrollY * 0.03, Math.max(width, height) * 0.4, 0.07 + energy * 0.04);

      // Flowing waveform lines
      for (let w = 0; w < 3; w++) {
        ctx!.beginPath();
        const baseY = height * (0.34 + w * 0.12);
        const amp = (18 + w * 8) * lift;
        for (let x = 0; x <= width; x += 8) {
          const nx = x / width;
          const envelope = Math.sin(nx * Math.PI);
          const y = baseY
            + Math.sin(nx * (5 + w * 2) + t * (0.7 + w * 0.25) + shift * (1 + w * 0.5)) * amp * envelope
            + Math.sin(nx * 13 - t * 0.9 + shift * 2) * amp * 0.25 * envelope;
          if (x === 0) ctx!.moveTo(x, y); else ctx!.lineTo(x, y);
        }
        ctx!.strokeStyle = `rgba(${GREEN}, ${0.16 - w * 0.04})`;
        ctx!.lineWidth = 1.5;
        ctx!.stroke();
      }

      // Spectrum bars along the bottom
      const gap = 4;
      const barW = Math.max(3, width / BAR_COUNT - gap);
      const maxH = height * 0.34;
      for (let i = 0; i < BAR_COUNT; i++) {
        const nx = i / (BAR_COUNT - 1);
        const wave = Math.abs(Math.sin(i * 0.33 + t * 1.3 + shift * 3) * Math.cos(i * 0.11 - t * 0.6 + shift));
        const nearPointer = Math.exp(-Math.pow((nx - pointerX) * 5, 2)) * 0.25;
        const h = maxH * (0.08 + 0.55 * wave + nearPointer) * lift * (0.6 + 0.4 * Math.sin(nx * Math.PI));
        const x = i * (barW + gap) + gap / 2;
        const g = ctx!.createLinearGradient(0, height, 0, height - h);
        g.addColorStop(0, `rgba(${GREEN}, 0.22)`);
        g.addColorStop(1, `rgba(${GREEN}, 0)`);
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.roundRect(x, height - h, barW, h, barW / 2);
        ctx!.fill();
      }
    }

    const loop = (time: number) => {
      if (!running) return;
      draw(time);
      raf = requestAnimationFrame(loop);
    };

    const onVisibility = () => {
      running = !document.hidden;
      if (running && !reduced) raf = requestAnimationFrame(loop);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('pointermove', onPointer, { passive: true });
    document.addEventListener('visibilitychange', onVisibility);
    if (reduced) draw(0); else raf = requestAnimationFrame(loop);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onPointer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-0 h-full w-full" />;
}
