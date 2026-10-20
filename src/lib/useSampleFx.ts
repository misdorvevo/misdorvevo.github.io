'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FxSettings, NEUTRAL_FX, buildDownloadName, decodeAudio, encodeWav, isNeutral, processAudio, sameComp,
} from '@/lib/audioFx';
import { fetchAudioWithRetry } from '@/lib/fetchAudio';

const DEBOUNCE_MS = 250;

interface Rendered {
  fileUrl: string;
  fx: FxSettings;
  blob: Blob;
  url: string;
}

const sameFx = (a: FxSettings, b: FxSettings) => a.speed === b.speed && a.semitones === b.semitones && sameComp(a.comp, b.comp);

export function useSampleFx(fileUrl: string) {
  const [fx, setFx] = useState<FxSettings>(NEUTRAL_FX);
  const [rendered, setRendered] = useState<Rendered | null>(null);
  const [failed, setFailed] = useState<{ fileUrl: string; fx: FxSettings } | null>(null);
  const sourceRef = useRef<{ fileUrl: string; buffer: Promise<AudioBuffer> } | null>(null);
  const renderedUrlRef = useRef<string | null>(null);

  const getSource = useCallback((signal?: AbortSignal) => {
    if (sourceRef.current?.fileUrl !== fileUrl) {
      const buffer = fetchAudioWithRetry(fileUrl, signal ?? new AbortController().signal)
        .then((blob) => blob.arrayBuffer())
        .then(decodeAudio);
      // Don't cache failures, so a later change can retry.
      buffer.catch(() => {
        if (sourceRef.current?.buffer === buffer) sourceRef.current = null;
      });
      sourceRef.current = { fileUrl, buffer };
    }
    return sourceRef.current.buffer;
  }, [fileUrl]);

  const renderFx = useCallback(async (settings: FxSettings, signal?: AbortSignal) => {
    const buffer = await getSource();
    const processed = await processAudio(buffer, settings, signal);
    return encodeWav(processed);
  }, [getSource]);

  useEffect(() => {
    if (isNeutral(fx)) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const blob = await renderFx(fx, controller.signal);
        if (controller.signal.aborted) return;
        const url = URL.createObjectURL(blob);
        const previous = renderedUrlRef.current;
        renderedUrlRef.current = url;
        setRendered({ fileUrl, fx, blob, url });
        // Give the waveform time to fetch the previous blob before it is revoked.
        if (previous) setTimeout(() => URL.revokeObjectURL(previous), 5000);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Audio effect failed:', err);
        setFailed({ fileUrl, fx });
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [fx, fileUrl, renderFx]);

  useEffect(() => () => {
    if (renderedUrlRef.current) URL.revokeObjectURL(renderedUrlRef.current);
  }, []);

  const neutral = isNeutral(fx);
  const current = rendered && rendered.fileUrl === fileUrl && sameFx(rendered.fx, fx) ? rendered : null;
  const hasFailed = !!failed && failed.fileUrl === fileUrl && sameFx(failed.fx, fx);
  const playUrl = neutral ? fileUrl : rendered?.fileUrl === fileUrl ? rendered.url : fileUrl;

  const download = useCallback(async (sample: { fileName: string; key?: string; bpm?: string }) => {
    let blob: Blob;
    if (neutral) {
      blob = await fetchAudioWithRetry(fileUrl, new AbortController().signal);
    } else {
      blob = current?.blob ?? (await renderFx(fx));
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = buildDownloadName(sample, fx);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }, [neutral, current, fx, fileUrl, renderFx]);

  return {
    fx,
    setFx,
    playUrl,
    processing: !neutral && !current && !hasFailed,
    error: hasFailed,
    download,
  };
}
