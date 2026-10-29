'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormBranding, LayoutPreset } from '@/types/form';
import { DEVICE_WIDTH, type PreviewDevice } from '@/components/preview/DeviceToggle';
import { Skeleton } from '@/components/ui/Skeleton';
import { bx } from '@/lib/utils';

// The Branding tab's preview is the REAL public form (the same /forms/[id]/preview?embed=1 document the layout gallery
// uses), not a hand-drawn imitation. Unsaved branding and layout are streamed into it over postMessage, so every control
// shows up as you change it without waiting for autosave.
const DESKTOP_WIDTH = 1100;
/** If the form never says it is drawn (it could not load, and says so itself), the frame is shown anyway after this long. */
const GIVE_UP_MS = 8000;

export interface LiveFormPreviewProps {
  formId: string;
  branding: FormBranding;
  /** The form's title as typed in the studio, not yet saved. */
  title?: string;
  layout?: LayoutPreset;
  /** The screen the form is shown on: a laptop (default), a tablet or a phone. */
  device?: PreviewDevice;
  /** Take the whole height the parent gives it (the Branding studio's tall stage) instead of a fixed 900px page. */
  fill?: boolean;
  /** With `fill`: how big the form is drawn, 1 = 100%. The form scrolls inside the stage. */
  zoom?: number;
}

export function LiveFormPreview({ formId, branding, title, layout, device = 'desktop', fill = false, zoom = 1 }: LiveFormPreviewProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [drawn, setDrawn] = useState(false);

  const send = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage({ type: 'beginso-live-branding', branding, layout, title }, window.location.origin);
  }, [branding, layout, title]);

  // Push on every change, and again when the iframe announces it is ready (it mounts after the first push).
  useEffect(send, [send]);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.data?.type === 'beginso-preview-ready') send();
      if (e.data?.type === 'beginso-preview-drawn') setDrawn(true);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [send]);

  // Until the form is drawn the frame holds a quiet placeholder of its own, so nothing else (the app, a half-loaded page) is seen first.
  useEffect(() => {
    const timer = window.setTimeout(() => setDrawn(true), GIVE_UP_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const desktop = device === 'desktop';
  const baseWidth = desktop ? DESKTOP_WIDTH : DEVICE_WIDTH[device];
  // Without `fill` the form is drawn at the width of its screen and scaled down to fit the column; with it, the zoom says how big it is.
  const scale = fill ? zoom : size.width > 0 ? Math.min(1, size.width / baseWidth) : 1;
  // On a laptop screen the form's own page IS the stage: the frame is as wide as the stage is at this zoom, so the page's background fills it
  // edge to edge and there is no second box (grey strips) around a narrower frame. A tablet or a phone keeps its real width, in the middle.
  const fillsStage = fill && desktop && size.width > 0;
  const frameWidth = fillsStage ? size.width / scale : baseWidth;
  const height = 900; // visible height of a fixed stage; the form scrolls inside it like a real page
  const stageHeight = fill ? size.height : height * scale;
  const frameHeight = fill ? size.height / scale : height;

  const frame = (
    <iframe
      ref={frameRef}
      title="Live form preview"
      src={`/forms/${formId}/preview?embed=1`}
      onLoad={send}
      className={bx('block origin-top-left border-0 bg-white transition-opacity duration-200', drawn ? 'opacity-100' : 'opacity-0')}
      style={{ width: frameWidth, height: frameHeight, transform: `scale(${scale})` }}
    />
  );

  return (
    <div
      ref={boxRef}
      className={bx('relative w-full rounded-xl border border-(--border-default) bg-(--bg-subtle) shadow-(--shadow-md)', fill && !desktop ? 'overflow-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden' : 'overflow-hidden', fill && 'h-full')}
      style={fill ? undefined : { height: stageHeight }}
    >
      {fillsStage ? (
        frame
      ) : (
        <div className="mx-auto overflow-hidden" style={{ width: frameWidth * scale, height: stageHeight }}>
          {frame}
        </div>
      )}
      {!drawn && (
        <div role="status" aria-label="Loading the preview" className="absolute inset-0 flex flex-col items-center gap-4 bg-(--bg-subtle) px-6 py-10">
          <Skeleton variant="title" width="45%" height={32} />
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} variant="block" width="55%" height={52} />
          ))}
        </div>
      )}
    </div>
  );
}
