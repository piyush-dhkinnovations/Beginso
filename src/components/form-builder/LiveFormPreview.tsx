'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormBranding, LayoutPreset } from '@/types/form';

// The Branding tab's preview is the REAL public form (the same /forms/[id]/preview?embed=1 document the layout gallery
// uses), not a hand-drawn imitation. Unsaved branding and layout are streamed into it over postMessage, so every control
// shows up as you change it without waiting for autosave. The form is rendered at a fixed desktop width and scaled to fit
// the column, so its real breakpoints behave like a laptop screen however narrow the panel is.
const DESKTOP_WIDTH = 1100;

export interface LiveFormPreviewProps {
  formId: string;
  branding: FormBranding;
  layout?: LayoutPreset;
}

export function LiveFormPreview({ formId, branding, layout }: LiveFormPreviewProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  const send = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage({ type: 'beginso-live-branding', branding, layout }, window.location.origin);
  }, [branding, layout]);

  // Push on every change, and again when the iframe announces it is ready (it mounts after the first push).
  useEffect(send, [send]);
  useEffect(() => {
    const onReady = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.data?.type === 'beginso-preview-ready') send();
    };
    window.addEventListener('message', onReady);
    return () => window.removeEventListener('message', onReady);
  }, [send]);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = width > 0 ? Math.min(1, width / DESKTOP_WIDTH) : 1;
  const height = 900; // visible height of the stage; the form scrolls inside it like a real page

  return (
    <div ref={boxRef} className="w-full overflow-hidden rounded-xl border border-(--border-default) shadow-(--shadow-md)" style={{ height: height * scale }}>
      <iframe
        ref={frameRef}
        title="Live form preview"
        src={`/forms/${formId}/preview?embed=1`}
        onLoad={send}
        className="block origin-top-left border-0 bg-white"
        style={{ width: DESKTOP_WIDTH, height, transform: `scale(${scale})` }}
      />
    </div>
  );
}
