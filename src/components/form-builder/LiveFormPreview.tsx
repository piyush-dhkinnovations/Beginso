'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormBranding, LayoutPreset } from '@/types/form';
import { DEVICE_WIDTH, type PreviewDevice } from '@/components/preview/DeviceToggle';
import { DeviceScreen } from '@/components/preview/PreviewFrame';
import { FormPageWash } from '@/components/preview/FormPageWash';
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
  /** What the frame shows: the form (default) or the thank-you screen people see after sending it. */
  screen?: 'form' | 'thanks';
}

export function LiveFormPreview({ formId, branding, title, layout, device = 'desktop', fill = false, zoom = 1, screen = 'form' }: LiveFormPreviewProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [drawn, setDrawn] = useState(false);

  const send = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage({ type: 'beginso-live-branding', branding, layout, title, screen }, window.location.origin);
  }, [branding, layout, title, screen]);

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
  const height = 900; // visible height of a fixed stage; the form scrolls inside it like a real page
  // Without `fill` the form is drawn at the width of its screen and scaled down to fit the column. With it the screens are the
  // full-screen preview's: a desktop is the whole stage, a tablet or phone is drawn as a device (shrunk if the stage is narrower),
  // and the zoom says how big the form is drawn on that screen.
  const fit = !desktop && size.width > 0 ? Math.min(1, (size.width - 48) / baseWidth) : 1;
  const scale = fill ? zoom * fit : size.width > 0 ? Math.min(1, size.width / baseWidth) : 1;
  const stageHeight = height * scale;

  const frame = (
    <iframe
      ref={frameRef}
      title="Live form preview"
      // in the studio the frame is see-through (bg=0): the stage draws the form's page, so only the form changes size
      src={`/forms/${formId}/preview?embed=1${fill ? '&bg=0' : ''}`}
      onLoad={send}
      className={bx('block origin-top-left border-0 transition-opacity duration-200', fill ? 'bg-transparent' : 'bg-white', drawn ? 'opacity-100' : 'opacity-0')}
      style={fill ? { width: `${100 / scale}%`, height: `${100 / scale}%`, transform: `scale(${scale})` } : { width: baseWidth, height, transform: `scale(${scale})` }}
    />
  );

  const placeholder = !drawn && (
    <div role="status" aria-label="Loading the preview" className="absolute inset-0 flex flex-col items-center gap-4 bg-(--bg-subtle) px-6 py-10">
      <Skeleton variant="title" width="45%" height={32} />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} variant="block" width="55%" height={52} />
      ))}
    </div>
  );
  const box = 'relative w-full overflow-hidden rounded-xl border border-(--border-default) shadow-(--shadow-md)';

  if (fill) {
    return (
      <div ref={boxRef} className={bx(box, 'h-full')}>
        <FormPageWash branding={branding} layout={layout} className="relative size-full">
          <DeviceScreen device={device} fit={fit}>
            {frame}
          </DeviceScreen>
        </FormPageWash>
        {placeholder}
      </div>
    );
  }

  return (
    <div ref={boxRef} className={bx(box, 'bg-(--bg-subtle)')} style={{ height: stageHeight }}>
      <div className="mx-auto overflow-hidden" style={{ width: baseWidth * scale, height: stageHeight }}>
        {frame}
      </div>
      {placeholder}
    </div>
  );
}
