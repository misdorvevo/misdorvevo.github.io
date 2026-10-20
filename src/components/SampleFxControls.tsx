'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import FxPanel from '@/components/FxPanel';
import { isNeutral } from '@/lib/audioFx';
import { useSampleFx } from '@/lib/useSampleFx';

const Waveform = dynamic(() => import('@/components/Waveform'), { ssr: false });

interface SampleFxControlsProps {
  fileUrl: string;
  fileName: string;
  sampleKey?: string;
  bpm?: string;
  isPlaying: boolean;
  onFinish: () => void;
}

// Renders as a fragment so it can sit inside a flex-wrap sample row: waveform, FX toggle and
// download button on the row, with the FX panel wrapping onto its own full-width line.
export default function SampleFxControls({ fileUrl, fileName, sampleKey, bpm, isPlaying, onFinish }: SampleFxControlsProps) {
  const { fx, setFx, playUrl, processing, error, download } = useSampleFx(fileUrl);
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      await download({ fileName, key: sampleKey, bpm });
    } catch (err) {
      console.error('Download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <div className="w-48 flex-shrink-0 hidden sm:block">
        <Waveform audioUrl={playUrl} isPlaying={isPlaying} onFinish={onFinish} lengthScale={1 / fx.speed} />
      </div>

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        title="Speed and pitch"
        className={`flex-shrink-0 px-3 py-2 rounded-lg text-sm font-semibold border transition-colors ${
          open || !isNeutral(fx)
            ? 'border-brand-500 text-brand-400 bg-brand-500/10'
            : 'border-gray-700 text-gray-300 hover:border-gray-500'
        }`}
      >
        FX
      </button>

      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        className="flex-shrink-0 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-black px-4 py-2 rounded-lg text-sm transition-colors font-semibold whitespace-nowrap"
      >
        {downloading ? 'Preparing...' : 'Download'}
      </button>

      {open && (
        <div className="basis-full">
          <FxPanel fx={fx} onChange={setFx} processing={processing} error={error} sampleKey={sampleKey} sampleBpm={bpm} />
        </div>
      )}
    </>
  );
}
