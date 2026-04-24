"use client";
import { useEffect, useRef, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";

interface WaveformProps {
  audioUrl: string;
  isPlaying: boolean;
  onSeek?: (time: number) => void;
  onFinish?: () => void;
}

export default function Waveform({ audioUrl, isPlaying, onSeek, onFinish }: WaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const waveSurferRef = useRef<WaveSurfer | null>(null);
  const isReadyRef = useRef(false);
  const audioElRef = useRef<HTMLAudioElement | null>(null);

  const handleFinish = useCallback(() => {
    onFinish?.();
  }, [onFinish]);

  useEffect(() => {
    if (!containerRef.current) return;

    if (waveSurferRef.current) {
      waveSurferRef.current.destroy();
      waveSurferRef.current = null;
      isReadyRef.current = false;
    }

    // Create a pre-loaded audio element for instant playback
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audio.src = audioUrl;
    audioElRef.current = audio;

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: "#525252",
      progressColor: "#f59e42",
      cursorColor: "transparent",
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      height: 32,
      normalize: true,
      media: audio,
    });

    ws.on("ready", () => {
      isReadyRef.current = true;
    });

    ws.on("finish", handleFinish);

    if (onSeek) {
      ws.on("seeking", (progress: number) => {
        const duration = ws.getDuration() || 0;
        onSeek(progress * duration);
      });
    }

    waveSurferRef.current = ws;

    return () => {
      ws.destroy();
      waveSurferRef.current = null;
      isReadyRef.current = false;
      audioElRef.current = null;
    };
  }, [audioUrl]);

  useEffect(() => {
    const ws = waveSurferRef.current;
    if (!ws) return;

    if (isPlaying) {
      // Play even if waveform isn't fully rendered yet — audio is pre-buffered
      ws.play().catch(() => {});
    } else {
      ws.pause();
    }
  }, [isPlaying]);

  return (
    <div
      ref={containerRef}
      className="w-full h-8 cursor-pointer select-none"
      style={{ minWidth: 120 }}
    />
  );
}
