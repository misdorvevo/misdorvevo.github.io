'use client';

import { useCallback, useEffect, useState } from 'react';
import Cropper, { Area } from 'react-easy-crop';

const OUTPUT_SIZE = 512;

interface AvatarCropperProps {
  file: File;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read that image.'));
    img.src = src;
  });
}

async function cropToFile(src: string, area: Area, baseName: string): Promise<File> {
  const img = await loadImage(src);
  const size = Math.min(OUTPUT_SIZE, Math.round(area.width));
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process the image.');
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
  if (!blob) throw new Error('Could not process the image.');
  return new File([blob], `${baseName.replace(/\.[^.]+$/, '') || 'avatar'}.jpg`, { type: 'image/jpeg' });
}

export default function AvatarCropper({ file, onCancel, onConfirm }: AvatarCropperProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setSrc(reader.result as string);
    reader.onerror = () => setError('Could not read that image.');
    reader.readAsDataURL(file);
    return () => {
      reader.onload = null;
      reader.onerror = null;
    };
  }, [file]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  const confirm = async () => {
    if (!src || !area) return;
    setBusy(true);
    setError('');
    try {
      onConfirm(await cropToFile(src, area, file.name));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not crop the image.');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Crop profile photo">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6">
        <h2 className="text-xl font-bold text-white mb-1">Crop your photo</h2>
        <p className="text-gray-400 text-sm mb-4">Drag to reposition and use the slider to zoom.</p>

        <div className="relative w-full h-80 bg-black rounded-xl overflow-hidden">
          {src && (
            <Cropper
              image={src}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={onCropComplete}
            />
          )}
        </div>

        <div className="flex items-center gap-3 mt-4">
          <span className="text-gray-400 text-xs">Zoom</span>
          <input
            type="range"
            aria-label="Zoom"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-brand-500"
          />
        </div>

        {error && <p className="text-red-400 text-sm mt-3">{error}</p>}

        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={onCancel} disabled={busy} className="px-4 py-2 rounded-lg text-gray-300 hover:text-white border border-gray-700 hover:bg-gray-800 disabled:opacity-50">
            Cancel
          </button>
          <button type="button" onClick={confirm} disabled={busy || !area} className="px-5 py-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-black font-semibold disabled:opacity-50">
            {busy ? 'Cropping...' : 'Use photo'}
          </button>
        </div>
      </div>
    </div>
  );
}
