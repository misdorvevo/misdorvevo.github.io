'use client';

import { useId } from 'react';
import Knob from '@/components/Knob';
import {
  COMP_RANGES, CompressorSettings, DEFAULT_COMP, FxSettings, NEUTRAL_FX, PITCH_MAX, PITCH_MIN, SPEED_MAX, SPEED_MIN, formatSemitones, isNeutral, randomFx, transposeKey,
} from '@/lib/audioFx';

interface FxPanelProps {
  fx: FxSettings;
  onChange: (fx: FxSettings) => void;
  processing: boolean;
  error: boolean;
  sampleKey?: string;
  sampleBpm?: string;
}

export default function FxPanel({ fx, onChange, processing, error, sampleKey, sampleBpm }: FxPanelProps) {
  const uid = useId();
  const newKey = transposeKey(sampleKey, fx.semitones);
  const bpmNumber = sampleBpm ? Number(sampleBpm) : NaN;
  const newBpm = Number.isFinite(bpmNumber) && bpmNumber > 0 ? Math.round(bpmNumber * fx.speed) : null;

  const comp = fx.comp;
  const setComp = (patch: Partial<CompressorSettings>) => onChange({ ...fx, comp: { ...comp, ...patch } });
  const knob = (key: Exclude<keyof CompressorSettings, 'enabled'>, label: string, unit: string, decimals = 0) => (
    <Knob
      label={label}
      value={comp[key]}
      {...COMP_RANGES[key]}
      defaultValue={DEFAULT_COMP[key]}
      unit={unit}
      decimals={decimals}
      disabled={!comp.enabled}
      onChange={(v) => setComp({ [key]: v })}
    />
  );

  return (
    <div className="mt-3 rounded-lg bg-gray-900 border border-gray-700 p-4 grid gap-4 sm:grid-cols-2">
      <div>
        <div className="flex justify-between text-xs text-gray-300 mb-1">
          <label htmlFor={`${uid}-speed`}>Speed</label>
          <span className="text-brand-400 font-semibold">
            {newBpm ? `${newBpm} BPM` : `${fx.speed.toFixed(2)}x`}
          </span>
        </div>
        <input
          id={`${uid}-speed`}
          type="range"
          min={SPEED_MIN}
          max={SPEED_MAX}
          step={0.01}
          value={fx.speed}
          onChange={(e) => onChange({ ...fx, speed: Number(e.target.value) })}
          onDoubleClick={() => onChange({ ...fx, speed: 1 })}
          className="w-full accent-brand-500"
        />
        <div className="mt-1 text-xs text-gray-500">
          {fx.speed.toFixed(2)}x{newBpm ? ` (original ${bpmNumber} BPM)` : ''}
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs text-gray-300 mb-1">
          <label htmlFor={`${uid}-pitch`}>Pitch</label>
          <span className="text-brand-400 font-semibold">
            {newKey ? `Key ${newKey}` : formatSemitones(fx.semitones)}
          </span>
        </div>
        <input
          id={`${uid}-pitch`}
          type="range"
          min={PITCH_MIN}
          max={PITCH_MAX}
          step={1}
          value={fx.semitones}
          onChange={(e) => onChange({ ...fx, semitones: Number(e.target.value) })}
          onDoubleClick={() => onChange({ ...fx, semitones: 0 })}
          className="w-full accent-brand-500"
        />
        <div className="mt-1 text-xs text-gray-500">
          {formatSemitones(fx.semitones)}{newKey ? ` (original ${sampleKey})` : ''}
        </div>
      </div>
      <div className="sm:col-span-2 border-t border-gray-700 pt-3">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-gray-300">Compressor</span>
          <button
            type="button"
            role="switch"
            aria-checked={comp.enabled}
            onClick={() => setComp({ enabled: !comp.enabled })}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
              comp.enabled ? 'border-brand-500 text-brand-400 bg-brand-500/10' : 'border-gray-700 text-gray-400'
            }`}
          >
            {comp.enabled ? 'On' : 'Off'}
          </button>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-3 justify-items-center">
          {knob('threshold', 'Threshold', ' dB')}
          {knob('ratio', 'Ratio', ':1', 1)}
          {knob('attack', 'Attack', ' ms', 1)}
          {knob('release', 'Release', ' ms')}
          {knob('knee', 'Knee', ' dB')}
          {knob('makeup', 'Makeup', ' dB', 1)}
          {knob('mix', 'Mix', '%')}
        </div>
        <p className="mt-2 text-[11px] text-gray-500">
          Drag a knob up or down, or focus it and use the arrow keys. Double-click to reset. Low threshold, high ratio and fast attack bring out the pitch-shift artifacts.
        </p>
      </div>
      <div className="sm:col-span-2 flex items-center justify-between text-xs">
        <span className={error ? 'text-red-400' : 'text-gray-500'}>
          {error
            ? 'Could not process this sample.'
            : processing
              ? 'Rendering...'
              : isNeutral(fx)
                ? 'Original sample. Downloads are unchanged.'
                : 'Downloads as a 24-bit WAV with the new key and BPM in the name.'}
        </span>
        <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => onChange({ ...randomFx(), reverse: fx.reverse })}
          title="Randomize pitch, speed and compression"
          className="font-semibold text-brand-400 hover:text-brand-300"
        >
          🎲 Random
        </button>
        <button
          type="button"
          onClick={() => onChange(NEUTRAL_FX)}
          disabled={isNeutral(fx)}
          className="text-brand-500 hover:text-brand-400 disabled:text-gray-600 disabled:cursor-default"
        >
          Reset
        </button>
        </div>
      </div>
    </div>
  );
}
