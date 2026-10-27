'use client';

import { useRef, type ReactNode } from 'react';

// Card with a soft green glow that follows the cursor.
export default function SpotlightCard({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty('--mx', `${e.clientX - r.left}px`);
        el.style.setProperty('--my', `${e.clientY - r.top}px`);
        // Subtle 3D tilt toward the cursor.
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateX(${(-py * 7).toFixed(2)}deg) rotateY(${(px * 7).toFixed(2)}deg) translateY(-3px)`;
      }}
      onPointerLeave={() => {
        if (ref.current) ref.current.style.transform = '';
      }}
      className={`group relative overflow-hidden rounded-2xl border border-gray-700/80 bg-gray-900/70 transition-[transform,border-color,box-shadow] duration-200 ease-out hover:border-brand-500/60 hover:shadow-[0_20px_50px_-20px_rgb(63_174_114/0.45)] will-change-transform ${className}`}
    >
      <div className="spotlight pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="relative">{children}</div>
    </div>
  );
}
