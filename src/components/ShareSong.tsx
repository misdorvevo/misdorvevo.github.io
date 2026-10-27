'use client';

import { useState } from 'react';
import { MAX_SHARE_SECONDS, renderShareVideo, supportsVideoExport } from '@/lib/shareVideo';

interface ShareSongProps {
  title: string;
  author: string;
  audioUrl: string;
}

const btn = 'px-4 py-2 rounded-lg text-sm font-semibold border border-gray-700 bg-gray-800 hover:bg-gray-700 text-white transition-colors disabled:opacity-50';

export default function ShareSong({ title, author, audioUrl }: ShareSongProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [video, setVideo] = useState<File | null>(null);
  const [error, setError] = useState('');

  const url = () => window.location.href;
  const text = `Listen to "${title}" by ${author} on Co-Drop`;
  const popup = (target: string) => window.open(target, '_blank', 'noopener,noreferrer,width=600,height=600');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy the link.');
    }
  };

  const nativeShare = () => navigator.share?.({ title, text, url: url() }).catch(() => {});

  const download = (file: File) => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  };

  const createVideo = async () => {
    setError('');
    setVideo(null);
    setProgress(0);
    try {
      setVideo(await renderShareVideo(audioUrl, title, author, setProgress));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the video.');
    } finally {
      setProgress(null);
    }
  };

  // The share sheet lets mobile users send the file straight to the Instagram or TikTok app.
  const shareVideo = async (file: File) => {
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title, text });
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    download(file);
  };

  return (
    <div className="w-full">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="px-6 py-3 rounded-lg font-semibold border border-gray-600 text-white hover:bg-gray-800 transition-colors">
        ↗ Share
      </button>

      {open && (
        <div className="mt-4 rounded-xl border border-gray-800 bg-gray-900 p-5 space-y-5">
          <div>
            <p className="text-sm text-gray-400 mb-2">Share a link</p>
            <div className="flex flex-wrap gap-2">
              <button className={btn} onClick={() => popup(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url())}`)}>X</button>
              <button className={btn} onClick={() => popup(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url())}`)}>Facebook</button>
              <button className={btn} onClick={() => popup(`https://wa.me/?text=${encodeURIComponent(`${text} ${url()}`)}`)}>WhatsApp</button>
              <button className={btn} onClick={copy}>{copied ? 'Copied!' : 'Copy link'}</button>
              {typeof navigator !== 'undefined' && 'share' in navigator && <button className={btn} onClick={nativeShare}>More…</button>}
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-400 mb-1">Instagram &amp; TikTok</p>
            <p className="text-xs text-gray-500 mb-3">
              These apps can&apos;t be posted to from a website. Create a video of your song (up to {MAX_SHARE_SECONDS}s), then share or
              upload it in the app — your track becomes the post&apos;s original audio.
            </p>
            {supportsVideoExport() ? (
              <div className="flex flex-wrap items-center gap-2">
                {!video && (
                  <button className={btn} onClick={createVideo} disabled={progress !== null}>
                    {progress !== null ? `Creating video… ${Math.round(progress * 100)}%` : 'Create video'}
                  </button>
                )}
                {video && (
                  <>
                    <button className={btn} onClick={() => shareVideo(video)}>Share video</button>
                    <button className={btn} onClick={() => download(video)}>Download</button>
                    <button className="text-xs text-gray-500 underline" onClick={() => setVideo(null)}>Re-create</button>
                  </>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-500">Video export isn&apos;t supported in this browser. Try Chrome or Safari.</p>
            )}
            {video?.type === 'video/webm' && (
              <p className="text-xs text-yellow-500 mt-2">This browser exports WebM, which Instagram may reject. Safari or a recent Chrome gives an MP4.</p>
            )}
            <p className="text-xs text-gray-500 mt-2">Keep this tab open while the video is created.</p>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      )}
    </div>
  );
}
