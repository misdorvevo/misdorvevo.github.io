import { SimpleFilter, SoundTouch } from 'soundtouchjs';

export const SPEED_MIN = 0.5;
export const SPEED_MAX = 2;
export const PITCH_MIN = -12;
export const PITCH_MAX = 12;

export interface CompressorSettings {
  enabled: boolean;
  threshold: number; // dB
  ratio: number; // :1
  attack: number; // ms
  release: number; // ms
  knee: number; // dB
  makeup: number; // dB
  mix: number; // 0-100, % wet (parallel compression)
}

export const COMP_RANGES = {
  threshold: { min: -60, max: 0, step: 1 },
  ratio: { min: 1, max: 20, step: 0.5 },
  attack: { min: 0.1, max: 100, step: 0.1 },
  release: { min: 10, max: 1000, step: 1 },
  knee: { min: 0, max: 30, step: 1 },
  makeup: { min: 0, max: 24, step: 0.5 },
  mix: { min: 0, max: 100, step: 1 },
} as const;

export const DEFAULT_COMP: CompressorSettings = {
  enabled: false, threshold: -24, ratio: 4, attack: 5, release: 120, knee: 6, makeup: 0, mix: 100,
};

export interface FxSettings {
  speed: number;
  semitones: number;
  comp: CompressorSettings;
  reverse: boolean;
}

export const NEUTRAL_FX: FxSettings = { speed: 1, semitones: 0, comp: DEFAULT_COMP, reverse: false };

export function isNeutral(fx: FxSettings) {
  return fx.speed === 1 && fx.semitones === 0 && !fx.comp.enabled && !fx.reverse;
}

function randomStep(range: { min: number; max: number; step: number }, lo = range.min, hi = range.max) {
  const steps = Math.round((hi - lo) / range.step);
  const value = lo + Math.floor(Math.random() * (steps + 1)) * range.step;
  return Math.round(value * 100) / 100;
}

// Musical ranges rather than the full extremes: speed 0.5x-2x (log-spaced), whole-semitone pitch, compressor always on.
export function randomFx(): FxSettings {
  return {
    speed: Math.round(2 ** (Math.random() * 2 - 1) * 100) / 100,
    semitones: Math.round(Math.random() * 24) - 12,
    comp: {
      enabled: true,
      threshold: randomStep(COMP_RANGES.threshold, -50, -6),
      ratio: randomStep(COMP_RANGES.ratio, 2, 12),
      attack: randomStep(COMP_RANGES.attack, 1, 50),
      release: randomStep(COMP_RANGES.release, 30, 500),
      knee: randomStep(COMP_RANGES.knee, 0, 20),
      makeup: randomStep(COMP_RANGES.makeup, 0, 12),
      mix: randomStep(COMP_RANGES.mix, 40, 100),
    },
    reverse: false,
  };
}

export function sameComp(a: CompressorSettings, b: CompressorSettings) {
  return a.enabled === b.enabled && a.threshold === b.threshold && a.ratio === b.ratio
    && a.attack === b.attack && a.release === b.release && a.knee === b.knee
    && a.makeup === b.makeup && a.mix === b.mix;
}

// Feed-forward, stereo-linked peak compressor with a soft knee. Gain reduction is smoothed in
// the dB domain (attack when reduction increases, release when it recovers), as in classic designs.
function applyCompressor(channels: Float32Array[], sampleRate: number, c: CompressorSettings) {
  const frames = channels[0].length;
  const attackCoef = Math.exp(-1 / (Math.max(0.01, c.attack) * 0.001 * sampleRate));
  const releaseCoef = Math.exp(-1 / (Math.max(1, c.release) * 0.001 * sampleRate));
  const makeup = 10 ** (c.makeup / 20);
  const wet = c.mix / 100;
  const slope = 1 - 1 / c.ratio;
  const halfKnee = c.knee / 2;
  let reduction = 0; // dB, >= 0

  for (let i = 0; i < frames; i++) {
    let peak = 0;
    for (const ch of channels) peak = Math.max(peak, Math.abs(ch[i]));
    const level = 20 * Math.log10(Math.max(peak, 1e-9));
    const over = level - c.threshold;
    let target = 0;
    if (c.knee > 0 && Math.abs(over) <= halfKnee) {
      const x = over + halfKnee;
      target = (slope * x * x) / (2 * c.knee);
    } else if (over > 0) {
      target = slope * over;
    }
    const coef = target > reduction ? attackCoef : releaseCoef;
    reduction = coef * reduction + (1 - coef) * target;
    const gain = 10 ** (-reduction / 20) * makeup;
    for (const ch of channels) {
      const dry = ch[i];
      const out = dry * (1 - wet) + dry * gain * wet;
      ch[i] = Math.max(-1, Math.min(1, out));
    }
  }
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_INDEX: Record<string, number> = {
  C: 0, 'C#': 1, DB: 1, D: 2, 'D#': 3, EB: 3, E: 4, F: 5, 'F#': 6, GB: 6, G: 7, 'G#': 8, AB: 8, A: 9, 'A#': 10, BB: 10, B: 11,
};

// Keeps any suffix (e.g. "m" in "Am") and returns null when the root note can't be parsed.
export function transposeKey(key: string | undefined, semitones: number): string | null {
  if (!key) return null;
  const match = key.trim().match(/^([A-Ga-g])([#♯b♭]?)(.*)$/);
  if (!match) return null;
  const accidental = match[2] === '♯' ? '#' : match[2] === '♭' ? 'b' : match[2];
  const root = NOTE_INDEX[(match[1] + accidental).toUpperCase()];
  if (root === undefined) return null;
  const shifted = (((root + semitones) % 12) + 12) % 12;
  return NOTE_NAMES[shifted] + match[3];
}

export function formatSemitones(n: number) {
  return `${n > 0 ? '+' : ''}${n} st`;
}

interface FxNameInput {
  fileName: string;
  key?: string;
  bpm?: string;
}

// Name parts: original name, the shifted key, the stretched BPM. When a value can't be
// derived (no key or BPM on the sample), a short marker is added so the change isn't lost.
export function buildDownloadName({ fileName, key, bpm }: FxNameInput, fx: FxSettings): string {
  const baseName = fileName.replace(/\.[^/.]+$/, '');
  const originalExt = fileName.match(/\.[^/.]+$/)?.[0] || '';
  const parts = [baseName];
  if (fx.reverse) parts.push('rev');

  const newKey = transposeKey(key, fx.semitones);
  if (newKey) parts.push(newKey);
  else if (key) parts.push(key);
  if (!key && fx.semitones !== 0) parts.push(`${fx.semitones > 0 ? '+' : ''}${fx.semitones}st`);

  const bpmNumber = bpm ? Number(bpm) : NaN;
  if (Number.isFinite(bpmNumber) && bpmNumber > 0) parts.push(String(Math.round(bpmNumber * fx.speed)));
  else if (bpm) parts.push(bpm);
  else if (fx.speed !== 1) parts.push(`${Number(fx.speed.toFixed(2))}x`);

  return parts.join('_') + (isNeutral(fx) ? originalExt : '.wav');
}

export async function decodeAudio(data: ArrayBuffer): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(1, 1, 44100);
  return ctx.decodeAudioData(data);
}

const TAIL_FRAMES = 16384;
const CHUNK_FRAMES = 8192;

// Source that pads with silence so the stretcher can flush its internal buffers at the end.
function paddedSource(buffer: AudioBuffer, reverse: boolean) {
  const left = buffer.getChannelData(0);
  const right = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : left;
  const total = buffer.length + TAIL_FRAMES;
  return {
    extract(target: Float32Array, numFrames: number, position: number) {
      const count = Math.max(0, Math.min(numFrames, total - position));
      for (let i = 0; i < count; i++) {
        const idx = position + i;
        const src = reverse ? left.length - 1 - idx : idx;
        target[i * 2] = src >= 0 && src < left.length ? left[src] : 0;
        target[i * 2 + 1] = src >= 0 && src < right.length ? right[src] : 0;
      }
      return count;
    },
  };
}

export interface ProcessedAudio {
  sampleRate: number;
  channels: Float32Array[];
}

// Speed and pitch are independent: SoundTouch time-stretches by `speed` while resampling to
// reach the pitch shift, so changing one never changes the other.
export async function processAudio(buffer: AudioBuffer, fx: FxSettings, signal?: AbortSignal): Promise<ProcessedAudio> {
  const st = new SoundTouch();
  st.tempo = fx.speed;
  st.pitchSemitones = fx.semitones;
  const filter = new SimpleFilter(paddedSource(buffer, fx.reverse), st);

  const expected = Math.max(1, Math.round(buffer.length / fx.speed));
  const left = new Float32Array(expected);
  const right = new Float32Array(expected);
  const chunk = new Float32Array(CHUNK_FRAMES * 2);
  let written = 0;

  while (written < expected) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const got = filter.extract(chunk, Math.min(CHUNK_FRAMES, expected - written));
    if (got === 0) break;
    for (let i = 0; i < got; i++) {
      left[written + i] = chunk[i * 2];
      right[written + i] = chunk[i * 2 + 1];
    }
    written += got;
    // Yield so slider dragging stays responsive during long renders.
    if (written % (CHUNK_FRAMES * 8) < CHUNK_FRAMES) await new Promise((r) => setTimeout(r, 0));
  }

  const mono = buffer.numberOfChannels === 1;
  const channels = mono ? [left.subarray(0, written)] : [left.subarray(0, written), right.subarray(0, written)];
  if (fx.comp.enabled) applyCompressor(channels, buffer.sampleRate, fx.comp);
  return { sampleRate: buffer.sampleRate, channels };
}

// 24-bit PCM WAV: imports cleanly into every DAW and avoids 16-bit quantisation of the stretched audio.
export function encodeWav({ sampleRate, channels }: ProcessedAudio): Blob {
  const numChannels = channels.length;
  const frames = channels[0].length;
  const bytesPerSample = 3;
  const dataSize = frames * numChannels * bytesPerSample;
  const view = new DataView(new ArrayBuffer(44 + dataSize));
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, 24, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < numChannels; c++) {
      const s = Math.max(-1, Math.min(1, channels[c][i]));
      const v = Math.round(s < 0 ? s * 0x800000 : s * 0x7fffff);
      view.setUint8(offset, v & 0xff);
      view.setUint8(offset + 1, (v >> 8) & 0xff);
      view.setUint8(offset + 2, (v >> 16) & 0xff);
      offset += 3;
    }
  }
  return new Blob([view], { type: 'audio/wav' });
}
