'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PublicFormSchema } from '@/types/publicForm';

// The real respondent renderer (PublicFormShell, in /try/preview) in an iframe. Desktop is drawn at a real laptop
// width and scaled down to fit the column, so its breakpoints behave like a laptop screen; mobile is drawn at 390px.
// Give it a fixed `height`, or `fill` to take all the height of a sized parent.
export const DESKTOP_WIDTH = 1100;
const MOBILE_WIDTH = 390;

export interface GuestPreviewFrameProps {
  schema: PublicFormSchema;
  height?: number;
  fill?: boolean;
  device?: 'desktop' | 'mobile';
  title?: string;
}

export function GuestPreviewFrame({ schema, height = 720, fill = false, device = 'desktop', title = 'Form preview' }: GuestPreviewFrameProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  const send = useCallback(() => {
    frameRef.current?.contentWindow?.postMessage({ type: 'beginso-guest-schema', schema }, window.location.origin);
  }, [schema]);

  useEffect(send, [send]);
  useEffect(() => {
    const onReady = (e: MessageEvent) => {
      if (e.source === frameRef.current?.contentWindow && e.data?.type === 'beginso-guest-preview-ready') send();
    };
    window.addEventListener('message', onReady);
    return () => window.removeEventListener('message', onReady);
  }, [send]);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setBox({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const mobile = device === 'mobile';
  // Desktop: never wider than the column unscaled, never narrower than a laptop.
  const frameWidth = mobile ? MOBILE_WIDTH : Math.max(DESKTOP_WIDTH, box.w);
  const scale = mobile || box.w === 0 ? 1 : Math.min(1, box.w / frameWidth);
  const visibleHeight = fill ? box.h : height * scale;
  const frameHeight = fill ? (mobile ? box.h : box.h / scale) : height;

  return (
    <div
      ref={boxRef}
      className={`w-full overflow-hidden rounded-lg border border-(--border-default) bg-(--bg-subtle) ${fill ? 'h-full' : ''}`}
      style={fill ? undefined : { height: visibleHeight }}
    >
      <iframe
        ref={frameRef}
        title={title}
        src="/try/preview"
        onLoad={send}
        className="block origin-top-left border-0 bg-white"
        style={{
          width: frameWidth,
          height: frameHeight,
          transform: `scale(${scale})`,
          marginInline: mobile ? 'auto' : undefined,
          transformOrigin: mobile ? 'top center' : 'top left',
        }}
      />
    </div>
  );
}
