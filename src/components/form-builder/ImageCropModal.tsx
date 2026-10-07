'use client';

import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

// Crop step for logo and cover uploads. A fixed-shape frame sits over the image; drag to move, slide (or +/-) to
// zoom, arrow keys nudge. "Use this crop" renders exactly the framed part at the output size and hands back a File.
// No library: it is a canvas draw of the visible region. The image always covers the frame (no empty edges).
export interface ImageCropModalProps {
  file: File | null;
  /** Frame shape = output shape. */
  aspect: number;
  outputWidth: number;
  /** PNG keeps a logo's transparency; JPEG keeps a cover photo small. */
  mime: 'image/png' | 'image/jpeg';
  title: string;
  onCancel: () => void;
  onConfirm: (cropped: File) => void;
}

const MAX_ZOOM = 4;

export function ImageCropModal({ file, aspect, outputWidth, mime, title, onCancel, onConfirm }: ImageCropModalProps) {
  return (
    <Modal isOpen={!!file} onClose={onCancel} title={title} description="Drag the image to choose the part you want. Use the slider to zoom.">
      {file && <Cropper file={file} aspect={aspect} outputWidth={outputWidth} mime={mime} onCancel={onCancel} onConfirm={onConfirm} />}
    </Modal>
  );
}

function Cropper({ file, aspect, outputWidth, mime, onCancel, onConfirm }: Omit<ImageCropModalProps, 'title'> & { file: File }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [frameW, setFrameW] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);
  const frameH = frameW / aspect;

  useEffect(() => {
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the object URL must be created and revoked with the effect
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const measure = () => setFrameW(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const base = nat && frameW ? Math.max(frameW / nat.w, frameH / nat.h) : 1; // scale at which the image just covers the frame
  const scale = base * zoom;

  // Keep the image covering the frame whatever the zoom / drag.
  const clamp = (o: { x: number; y: number }, s = scale) => {
    if (!nat) return o;
    const mx = Math.max(0, (nat.w * s - frameW) / 2);
    const my = Math.max(0, (nat.h * s - frameH) / 2);
    return { x: Math.min(mx, Math.max(-mx, o.x)), y: Math.min(my, Math.max(-my, o.y)) };
  };

  const changeZoom = (z: number) => {
    const next = Math.min(MAX_ZOOM, Math.max(1, z));
    setZoom(next);
    setOffset((o) => clamp(o, base * next));
  };

  const confirm = async () => {
    if (!nat || !src) return;
    setBusy(true);
    try {
      const img = new Image();
      img.src = src;
      await img.decode();
      const outW = outputWidth;
      const outH = Math.round(outputWidth / aspect);
      const sw = frameW / scale;
      const sh = frameH / scale;
      const sx = (nat.w * scale / 2 - frameW / 2 - offset.x) / scale;
      const sy = (nat.h * scale / 2 - frameH / 2 - offset.y) / scale;
      const canvas = document.createElement('canvas');
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas');
      if (mime === 'image/jpeg') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, outW, outH);
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);
      const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, mime, 0.9));
      if (!blob) throw new Error('blob');
      const ext = mime === 'image/png' ? 'png' : 'jpg';
      onConfirm(new File([blob], `${file.name.replace(/\.[^.]+$/, '')}-cropped.${ext}`, { type: mime }));
    } finally {
      setBusy(false);
    }
  };

  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 20 : 6;
    const move = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
    if (move) {
      e.preventDefault();
      setOffset((o) => clamp({ x: o.x + move[0], y: o.y + move[1] }));
    } else if (e.key === '+' || e.key === '=') changeZoom(zoom + 0.2);
    else if (e.key === '-') changeZoom(zoom - 0.2);
  };

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={frameRef}
        role="application"
        aria-label="Crop area. Drag or use the arrow keys to move the image, plus and minus to zoom."
        tabIndex={0}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          drag.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (d) setOffset(clamp({ x: d.ox + e.clientX - d.px, y: d.oy + e.clientY - d.py }));
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        className="relative w-full overflow-hidden rounded-md bg-(--bg-sunken) cursor-grab active:cursor-grabbing touch-none outline-none focus-visible:ring-2 focus-visible:ring-(--border-focus)"
        style={{ aspectRatio: String(aspect) }}
      >
        {src && (
          // eslint-disable-next-line @next/next/no-img-element -- local object URL, not a static asset
          <img
            src={src}
            alt=""
            draggable={false}
            onLoad={(e) => setNat({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            className="absolute left-1/2 top-1/2 max-w-none select-none"
            style={{
              width: nat ? nat.w * scale : undefined,
              height: nat ? nat.h * scale : undefined,
              transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              visibility: nat ? 'visible' : 'hidden',
            }}
          />
        )}
        {/* Rule-of-thirds guide so the framing is easy to judge. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 border-2 border-white/80 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.25)]">
          <div className="absolute inset-y-0 left-1/3 w-px bg-white/40" />
          <div className="absolute inset-y-0 left-2/3 w-px bg-white/40" />
          <div className="absolute inset-x-0 top-1/3 h-px bg-white/40" />
          <div className="absolute inset-x-0 top-2/3 h-px bg-white/40" />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <label htmlFor="crop-zoom" className="bg-body-sm font-medium text-(--text-secondary)">Zoom</label>
        <input
          id="crop-zoom"
          type="range"
          min={1}
          max={MAX_ZOOM}
          step={0.01}
          value={zoom}
          onChange={(e) => changeZoom(Number(e.target.value))}
          className="flex-1 min-h-11"
          aria-valuetext={`${Math.round(zoom * 100)}%`}
        />
        <span className="w-12 text-right bg-caption text-(--text-muted)" aria-hidden="true">{Math.round(zoom * 100)}%</span>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-(--border-subtle)">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="button" onClick={() => void confirm()} isLoading={busy} disabled={!nat}>
          Use this crop
        </Button>
      </div>
    </div>
  );
}
