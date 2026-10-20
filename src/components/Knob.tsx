'use client';

import { useRef } from 'react';

interface KnobProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit: string;
  decimals?: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}

const SWEEP = 270;

// Rotary control: drag up/down (or use arrow keys) to change, double-click to reset.
export default function Knob({ label, value, min, max, step, defaultValue, unit, decimals = 0, disabled, onChange }: KnobProps) {
  const drag = useRef<{ y: number; value: number } | null>(null);
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  const angle = ((value - min) / (max - min)) * SWEEP - SWEEP / 2;

  return (
    <div className={`flex flex-col items-center select-none ${disabled ? 'opacity-40' : ''}`}>
      <div
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-disabled={disabled}
        className="w-12 h-12 rounded-full bg-gray-800 border border-gray-600 relative cursor-ns-resize touch-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        onPointerDown={(e) => {
          if (disabled) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { y: e.clientY, value };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const delta = (drag.current.y - e.clientY) / 150;
          onChange(clamp(drag.current.value + delta * (max - min)));
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
        onDoubleClick={() => !disabled && onChange(defaultValue)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'ArrowUp' || e.key === 'ArrowRight') { e.preventDefault(); onChange(clamp(value + step)); }
          if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') { e.preventDefault(); onChange(clamp(value - step)); }
        }}
      >
        <div className="absolute inset-0" style={{ transform: `rotate(${angle}deg)` }}>
          <div className="absolute left-1/2 top-1 -translate-x-1/2 w-1 h-3 rounded bg-brand-500" />
        </div>
      </div>
      <span className="mt-1 text-[11px] text-gray-400">{label}</span>
      <span className="text-xs font-semibold text-brand-400">{value.toFixed(decimals)}{unit}</span>
    </div>
  );
}
