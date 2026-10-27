"use client";
import { useEffect, useRef, useState } from "react";
import WaveSurfer from "wavesurfer.js";
import { fetchAudioWithRetry } from "@/lib/fetchAudio";

interface WaveformProps {
  audioUrl: string;
  isPlaying: boolean;
  onSeek?: (time: number) => void;
  onFinish?: () => void;
  // Relative length versus the original sample; shrinks or grows the drawn waveform to match.
  lengthScale?: number;
}

export default function Waveform({ audioUrl, isPlaying, onSeek, onFinish, lengthScale }: WaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const isReadyRef = useRef(false);
  const isPlayingRef = useRef(isPlaying);
  const onFinishRef = useRef(onFinish);
  const onSeekRef = useRef(onSeek);
  const [result, setResult] = useState<{ url: string; state: "ready" | "error" } | null>(null);
  const status = result?.url === audioUrl ? result.state : "loading";

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    onFinishRef.current = onFinish;
    onSeekRef.current = onSeek;
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const controller = new AbortController();
    let objectUrl: string | null = null;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#525252",
      progressColor: "#5cc088",
      cursorColor: "transparent",
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 32,
      normalize: true,
    });
    waveSurferRef.current = ws;
    isReadyRef.current = false;

    ws.on("ready", () => {
      isReadyRef.current = true;
      setResult({ url: audioUrl, state: "ready" });
      if (isPlayingRef.current) ws.play().catch(() => {});
    });
    ws.on("finish", () => onFinishRef.current?.());
    ws.on("seeking", (time: number) => onSeekRef.current?.(time));
    ws.on("error", (err) => {
      console.error("Waveform error:", err);
      setResult({ url: audioUrl, state: "error" });
    });

    fetchAudioWithRetry(audioUrl, controller.signal)
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        return ws.load(objectUrl);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error("Failed to load audio for waveform:", err);
        setResult({ url: audioUrl, state: "error" });
      });

    return () => {
      controller.abort();
      // Destroying mid-load rejects with an AbortError; that's expected here.
      try {
        Promise.resolve(ws.destroy()).catch(() => {});
      } catch {}
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      waveSurferRef.current = null;
      isReadyRef.current = false;
    };
  }, [audioUrl]);

  useEffect(() => {
    const ws = waveSurferRef.current;
    if (!ws || !isReadyRef.current) return;

    if (isPlaying) {
      ws.play().catch(() => {});
    } else {
      ws.pause();
    }
  }, [isPlaying]);

  return (
    <div className="relative w-full h-8" style={{ minWidth: 120 }}>
      <div
        ref={containerRef}
        className="h-8 cursor-pointer select-none"
        style={lengthScale === undefined ? { width: "100%" } : { width: `${Math.min(100, Math.max(8, 55 * lengthScale))}%` }}
      />
      {status === "loading" && (
        <div className="absolute inset-0 flex items-center pointer-events-none">
          <div className="w-full h-0.5 bg-gray-700 animate-pulse rounded" />
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500 pointer-events-none">
          Waveform unavailable
        </div>
      )}
    </div>
  );
}
