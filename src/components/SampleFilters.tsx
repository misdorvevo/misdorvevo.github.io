'use client';

import { useState, useRef, useEffect } from 'react';

const GENRE_OPTIONS = ['Electronic', 'Hip-Hop', 'Ambient', 'Techno', 'House', 'Experimental', 'Pop', 'Other'];
const TYPE_OPTIONS = ['Sample', 'Synthesizer', 'Keys and Piano', 'Noise', 'Drums', 'Percussion', 'Bass', 'Guitar', 'Strings', 'Brass', 'Woodwinds', 'Vocal', 'FX', 'Pluck', 'Pad', 'Lead', 'Arp', 'Bell', 'Mallet', 'Organ', 'Other'];
const KEY_OPTIONS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const EMOTION_OPTIONS = ['Dark', 'Bright', 'Energetic', 'Calm', 'Aggressive', 'Peaceful', 'Uplifting', 'Melancholic'];

export interface Filters {
  genre: string;
  type: string;
  key: string;
  emotion: string;
  bpmMode: 'off' | 'range' | 'exact';
  bpmMin: number;
  bpmMax: number;
  bpmExact: number;
}

export const DEFAULT_FILTERS: Filters = {
  genre: '',
  type: '',
  key: '',
  emotion: '',
  bpmMode: 'off',
  bpmMin: 60,
  bpmMax: 200,
  bpmExact: 120,
};

interface FilterDropdownProps {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
}

function FilterDropdown({ label, value, options, onChange }: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
          value
            ? 'bg-brand-500/20 border-brand-500 text-brand-400'
            : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
        }`}
      >
        {value || label}
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-48 max-h-64 overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg shadow-xl shadow-black/50">
          <button
            onClick={() => { onChange(''); setOpen(false); }}
            className={`w-full text-left px-3 py-2 text-sm transition-colors ${
              !value ? 'text-brand-400 bg-gray-800' : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            All {label}s
          </button>
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                value === opt ? 'text-brand-400 bg-gray-800' : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface BpmFilterProps {
  bpmMode: Filters['bpmMode'];
  bpmMin: number;
  bpmMax: number;
  bpmExact: number;
  onChange: (updates: Partial<Filters>) => void;
}

function BpmFilter({ bpmMode, bpmMin, bpmMax, bpmExact, onChange }: BpmFilterProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const label = bpmMode === 'exact'
    ? `${bpmExact} BPM`
    : bpmMode === 'range'
      ? `${bpmMin}–${bpmMax} BPM`
      : 'BPM';

  const active = bpmMode !== 'off';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
          active
            ? 'bg-brand-500/20 border-brand-500 text-brand-400'
            : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-600'
        }`}
      >
        {label}
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-xl shadow-black/50 p-4">
          {/* Mode selector */}
          <div className="flex rounded-lg overflow-hidden border border-gray-700 mb-4">
            {(['off', 'range', 'exact'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => onChange({ bpmMode: mode })}
                className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
                  bpmMode === mode
                    ? 'bg-brand-500 text-black'
                    : 'bg-gray-800 text-gray-400 hover:text-gray-200'
                }`}
              >
                {mode === 'off' ? 'Off' : mode === 'range' ? 'Range' : 'Exact'}
              </button>
            ))}
          </div>

          {bpmMode === 'range' && (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>Min: {bpmMin}</span>
                  <span>Max: {bpmMax}</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={300}
                  value={bpmMin}
                  onChange={e => {
                    const v = Number(e.target.value);
                    onChange({ bpmMin: Math.min(v, bpmMax - 1) });
                  }}
                  className="w-full accent-brand-500 h-1.5"
                />
                <input
                  type="range"
                  min={20}
                  max={300}
                  value={bpmMax}
                  onChange={e => {
                    const v = Number(e.target.value);
                    onChange({ bpmMax: Math.max(v, bpmMin + 1) });
                  }}
                  className="w-full accent-brand-500 h-1.5"
                />
              </div>
            </div>
          )}

          {bpmMode === 'exact' && (
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={20}
                  max={300}
                  value={bpmExact}
                  onChange={e => onChange({ bpmExact: Number(e.target.value) })}
                  className="flex-1 accent-brand-500 h-1.5"
                />
                <input
                  type="number"
                  min={20}
                  max={300}
                  value={bpmExact}
                  onChange={e => onChange({ bpmExact: Number(e.target.value) })}
                  className="w-16 bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm text-white text-center focus:outline-none focus:border-brand-500"
                />
              </div>
              <p className="text-xs text-gray-500 text-center">{bpmExact} BPM</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface SampleFiltersProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
}

export default function SampleFilters({ filters, onChange }: SampleFiltersProps) {
  const update = (partial: Partial<Filters>) => onChange({ ...filters, ...partial });
  const hasActive = filters.genre || filters.type || filters.key || filters.emotion || filters.bpmMode !== 'off';

  return (
    <div className="flex flex-wrap items-center gap-2 mb-6">
      <FilterDropdown label="Genre" value={filters.genre} options={GENRE_OPTIONS} onChange={v => update({ genre: v })} />
      <FilterDropdown label="Type" value={filters.type} options={TYPE_OPTIONS} onChange={v => update({ type: v })} />
      <FilterDropdown label="Key" value={filters.key} options={KEY_OPTIONS} onChange={v => update({ key: v })} />
      <FilterDropdown label="Mood" value={filters.emotion} options={EMOTION_OPTIONS} onChange={v => update({ emotion: v })} />
      <BpmFilter
        bpmMode={filters.bpmMode}
        bpmMin={filters.bpmMin}
        bpmMax={filters.bpmMax}
        bpmExact={filters.bpmExact}
        onChange={update}
      />
      {hasActive && (
        <button
          onClick={() => onChange(DEFAULT_FILTERS)}
          className="px-3 py-2 rounded-lg text-sm font-medium text-gray-400 hover:text-white transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  );
}

export function filterSamples<T extends { genre?: string; type?: string; key?: string; bpm?: string; emotions?: string[] }>(
  samples: T[],
  filters: Filters
): T[] {
  return samples.filter(s => {
    if (filters.genre && s.genre !== filters.genre) return false;
    if (filters.type && s.type !== filters.type) return false;
    if (filters.key && s.key !== filters.key) return false;
    if (filters.emotion && !(s.emotions || []).includes(filters.emotion)) return false;
    if (filters.bpmMode !== 'off' && s.bpm) {
      const bpm = parseInt(s.bpm, 10);
      if (isNaN(bpm)) return false;
      if (filters.bpmMode === 'exact' && bpm !== filters.bpmExact) return false;
      if (filters.bpmMode === 'range' && (bpm < filters.bpmMin || bpm > filters.bpmMax)) return false;
    }
    return true;
  });
}
