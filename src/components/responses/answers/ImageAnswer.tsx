'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Download, ImageOff, X, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { imageSettings } from '@/lib/fieldDisplay';
import { useFileBlobUrls } from '@/hooks/useFileBlobUrls';
import type { FormField } from '@/types/form';
import type { IResponseFile } from '@/types/response';

interface ImageAnswerProps {
  responseId: string;
  field?: FormField;
  files: IResponseFile[];
  compact?: boolean;
}

// Smallest grid column per "Preview size" setting for several images; a single image is capped to this width
// instead (Large = no cap: it shows at its own size, up to the width of the answer).
const MIN_COLUMN_PX = { small: 96, medium: 160, large: 240 } as const;
const SINGLE_MAX_PX = { small: 160, medium: 320, large: undefined } as const;

interface Shown {
  id: string;
  name: string;
  url: string;
}

function Lightbox({ images, start, onClose }: { images: Shown[]; start: number; onClose: () => void }) {
  const [index, setIndex] = useState(start);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const count = images.length;

  // Registered on `window` in the CAPTURE phase so it runs before the response drawer's own document-level
  // handlers: Escape closes only this viewer (not the drawer behind it), and Tab stays inside the viewer.
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'ArrowLeft' && count > 1) {
        e.stopPropagation();
        setIndex((i) => (i - 1 + count) % count);
      } else if (e.key === 'ArrowRight' && count > 1) {
        e.stopPropagation();
        setIndex((i) => (i + 1) % count);
      } else if (e.key === 'Tab') {
        e.stopPropagation();
        const buttons = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>('button') ?? []);
        if (buttons.length === 0) return;
        e.preventDefault();
        const at = buttons.indexOf(document.activeElement as HTMLElement);
        buttons[(at + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      previous?.focus();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- registered once; `count` never changes while open
  }, []);

  const current = images[index];
  const navClass = 'absolute top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-(--surface-card) text-(--text-primary) shadow-(--shadow-md) hover:bg-(--surface-hover)';

  return createPortal(
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Image viewer: ${current.name}`}
      className="fixed inset-0 z-100 flex items-center justify-center bg-black/80 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <button ref={closeRef} type="button" onClick={onClose} aria-label="Close image viewer" className={cn(navClass, 'right-4 top-8')}>
        <X size={18} aria-hidden="true" />
      </button>
      {/* A button (not a link) so the viewer's Tab trap reaches it. The URL is the already-fetched private file's blob:, so this is a local save. */}
      <button
        type="button"
        aria-label={`Download ${current.name}`}
        onClick={() => {
          const a = document.createElement('a');
          a.href = current.url;
          a.download = current.name;
          a.click();
        }}
        className={cn(navClass, 'right-20 top-8')}
      >
        <Download size={18} aria-hidden="true" />
      </button>
      {count > 1 && (
        <>
          <button type="button" aria-label="Previous image" onClick={() => setIndex((i) => (i - 1 + count) % count)} className={cn(navClass, 'left-4')}>
            <ChevronLeft size={18} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Next image" onClick={() => setIndex((i) => (i + 1) % count)} className={cn(navClass, 'right-4')}>
            <ChevronRight size={18} aria-hidden="true" />
          </button>
        </>
      )}
      <figure className="flex max-h-full max-w-full flex-col items-center gap-2">
        {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL of a private response file */}
        <img src={current.url} alt={current.name} className="max-h-[85vh] max-w-full rounded-md object-contain" />
        <figcaption className="bg-body-sm text-white">
          {current.name}
          {count > 1 ? ` · ${index + 1} of ${count}` : ''}
        </figcaption>
      </figure>
    </div>,
    document.body
  );
}

export function ImageAnswer({ responseId, field, files, compact = false }: ImageAnswerProps) {
  // The Table layout shows small thumbnails in a row; the full-size view is still one click away.
  const s = compact ? { ...imageSettings(field), previewSize: 'small' as const } : imageSettings(field);
  const states = useFileBlobUrls(responseId, files.map((f) => f.id));
  const [openAt, setOpenAt] = useState<number | null>(null);
  const single = files.length === 1;

  // A fixed ratio only sets the FRAME; the picture inside is always fully visible (contain, never cropped).
  const frame = s.aspectRatio === '16:9' ? 'aspect-video' : s.aspectRatio === '1:1' ? 'aspect-square' : '';
  const shown: Shown[] = files.flatMap((f) => {
    const state = states[f.id];
    return state?.status === 'ready' ? [{ id: f.id, name: f.name, url: state.url }] : [];
  });

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <ul
        className={cn(single ? 'max-w-full' : 'grid items-start gap-2')}
        style={
          single
            ? { maxWidth: SINGLE_MAX_PX[s.previewSize] }
            : { gridTemplateColumns: `repeat(auto-fill, minmax(${MIN_COLUMN_PX[s.previewSize]}px, 1fr))` }
        }
      >
        {files.map((file) => {
          const state = states[file.id];
          const shownIndex = shown.findIndex((x) => x.id === file.id);
          return (
            <li key={file.id} className="min-w-0">
              {state?.status === 'ready' ? (
                <button
                  type="button"
                  onClick={() => setOpenAt(shownIndex)}
                  aria-label={`View full size: ${file.name}`}
                  className={cn(
                    'group relative block max-w-full overflow-hidden rounded-md border border-(--border-default) bg-(--bg-subtle)',
                    frame ? `w-full ${frame}` : single ? 'w-fit' : 'w-full'
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL of a private response file */}
                  <img
                    src={state.url}
                    alt={file.name}
                    loading="lazy"
                    className={frame ? 'h-full w-full object-contain' : cn('block h-auto max-w-full', single ? 'max-h-[70vh] w-auto' : 'w-full')}
                  />
                  <span className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-(--surface-card) text-(--text-primary) opacity-0 shadow-(--shadow-sm) transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <ZoomIn size={15} aria-hidden="true" />
                  </span>
                </button>
              ) : state?.status === 'error' ? (
                <div role="img" aria-label={`Could not load ${file.name}`} className="flex min-h-24 w-full flex-col items-center justify-center gap-1 rounded-md border border-(--border-default) bg-(--bg-subtle) p-2 text-center text-(--text-muted)">
                  <ImageOff size={18} aria-hidden="true" />
                  <span className="max-w-full truncate bg-caption">{file.name}</span>
                </div>
              ) : (
                <div aria-busy="true" className={cn('min-h-24 w-full animate-pulse rounded-md bg-(--bg-subtle)', s.aspectRatio === '1:1' ? 'aspect-square' : 'aspect-video')} />
              )}
            </li>
          );
        })}
      </ul>
      {!compact && (
        <p className="bg-caption text-(--text-muted)">
          {single ? 'Uploaded image' : `${files.length} uploaded images`} · Click to view full size
        </p>
      )}
      {openAt !== null && shown.length > 0 && <Lightbox images={shown} start={Math.min(openAt, shown.length - 1)} onClose={() => setOpenAt(null)} />}
    </div>
  );
}
