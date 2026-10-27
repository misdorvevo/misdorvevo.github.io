import { fetchAudioWithRetry } from '@/lib/fetchAudio';

export const MAX_SHARE_SECONDS = 60;
const SIZE = 720;

const MIME_CANDIDATES = [
  'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
  'video/mp4',
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

export function supportsVideoExport(): boolean {
  return typeof MediaRecorder !== 'undefined' && MIME_CANDIDATES.some((m) => MediaRecorder.isTypeSupported(m));
}

function drawFrame(ctx: CanvasRenderingContext2D, bars: Uint8Array, title: string, author: string, t: number) {
  const g = ctx.createLinearGradient(0, 0, SIZE, SIZE);
  g.addColorStop(0, '#111827');
  g.addColorStop(1, '#030712');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);

  const count = 48;
  const gap = 6;
  const w = (SIZE - 120 - gap * (count - 1)) / count;
  ctx.fillStyle = '#facc15';
  for (let i = 0; i < count; i++) {
    const v = bars[Math.floor((i / count) * bars.length * 0.7)] / 255;
    const h = Math.max(6, v * 300);
    ctx.fillRect(60 + i * (w + gap), SIZE / 2 + 40 - h / 2, w, h);
  }

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillText(title.length > 28 ? title.slice(0, 27) + '…' : title, SIZE / 2, 120);
  ctx.fillStyle = '#9ca3af';
  ctx.font = '28px system-ui, sans-serif';
  ctx.fillText(`by ${author}`, SIZE / 2, 168);
  ctx.fillStyle = '#facc15';
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.fillText('Co-Drop', SIZE / 2, SIZE - 50);
  ctx.fillStyle = '#374151';
  ctx.fillRect(60, SIZE - 100, SIZE - 120, 4);
  ctx.fillStyle = '#facc15';
  ctx.fillRect(60, SIZE - 100, (SIZE - 120) * Math.min(1, t), 4);
}

// Renders the song's audio over an animated visualizer in real time and returns a video file.
export async function renderShareVideo(
  audioUrl: string,
  title: string,
  author: string,
  onProgress?: (fraction: number) => void
): Promise<File> {
  const mimeType = MIME_CANDIDATES.find((m) => MediaRecorder.isTypeSupported(m));
  if (!mimeType) throw new Error('Video export is not supported in this browser.');

  const blob = await fetchAudioWithRetry(audioUrl, new AbortController().signal);
  const audioCtx = new AudioContext();
  try {
    const buffer = await audioCtx.decodeAudioData(await blob.arrayBuffer());
    const duration = Math.min(buffer.duration, MAX_SHARE_SECONDS);

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    const dest = audioCtx.createMediaStreamDestination();
    source.connect(analyser);
    analyser.connect(dest);

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext('2d')!;
    const stream = new MediaStream([...canvas.captureStream(30).getVideoTracks(), ...dest.stream.getAudioTracks()]);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });

    const bars = new Uint8Array(analyser.frequencyBinCount);
    const start = audioCtx.currentTime;
    recorder.start(500);
    source.start(0, 0, duration);

    await new Promise<void>((resolve) => {
      const tick = () => {
        const t = (audioCtx.currentTime - start) / duration;
        analyser.getByteFrequencyData(bars);
        drawFrame(ctx, bars, title, author, t);
        onProgress?.(Math.min(1, t));
        if (t >= 1) resolve();
        else requestAnimationFrame(tick);
      };
      tick();
    });

    recorder.stop();
    await stopped;
    const type = mimeType.split(';')[0];
    const ext = type === 'video/mp4' ? 'mp4' : 'webm';
    const safe = title.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'song';
    return new File(chunks, `${safe}.${ext}`, { type });
  } finally {
    audioCtx.close().catch(() => {});
  }
}
