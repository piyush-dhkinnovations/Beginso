'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Skeleton } from '@/components/ui/Skeleton';
import { bx } from '@/lib/utils';
import type { PreviewDevice } from './DeviceToggle';
import { DEVICE_WIDTH } from './DeviceToggle';

/** If the form never says it is drawn, the frame is shown anyway after this long. */
const GIVE_UP_MS = 8000;

// Desktop is the screen as it is. A tablet and a phone are drawn as devices on it: their real width, a frame around the
// screen and everything outside dimmed. Without the frame a tablet looked exactly like the desktop, since most forms are
// narrower than both. Every value has a counterpart in the others, so switching moves smoothly from one to the next.
const NO_SHADOW = '0 0 0 0 rgb(15 23 42 / 0), 0 0 0 0 rgb(15 23 42 / 0)';
const DEVICE_SHADOW = '0 24px 48px 0 rgb(15 23 42 / 0.35), 0 0 0 100vmax rgb(15 23 42 / 0.32)';
const framed = (device: 'tablet' | 'mobile', border: number, radius: number, tallest: number): CSSProperties => ({
  width: DEVICE_WIDTH[device],
  maxWidth: `calc(100% - ${border * 2 + 16}px)`,
  // Leaves room above for the floating preview control.
  height: 'calc(100% - 88px)',
  maxHeight: tallest,
  marginTop: 56,
  borderWidth: border,
  borderRadius: radius,
  boxShadow: DEVICE_SHADOW,
});

const SCREENS: Record<PreviewDevice, CSSProperties> = {
  desktop: { width: '100%', maxWidth: '100%', height: '100%', maxHeight: '100vh', marginTop: 0, borderWidth: 0, borderRadius: 0, boxShadow: NO_SHADOW },
  tablet: framed('tablet', 14, 36, 1024),
  mobile: framed('mobile', 10, 48, 812),
};

// Renders the respondent view in a same-origin <iframe> (`/forms/[id]/preview?embed=1`). An iframe,
// not a width-constrained div, so the form's real @media breakpoints respond to the chosen device
// width (same reasoning as /dev/ui/frame). It is see-through (`bg=0`): the page behind it draws the
// form's background over the whole screen. It also holds the only loading placeholder: the frame's own document stays blank
// until it has the form, so one placeholder is seen from the click to the form, not one for each step on the way.
export interface PreviewFrameProps {
  formId: string;
  device: PreviewDevice;
  /** Overrides the form's saved layout — used by the layout gallery to preview a preset before Use. */
  layout?: string;
  title: string;
}

export function PreviewFrame({ formId, device, layout, title }: PreviewFrameProps) {
  const params = new URLSearchParams({ embed: '1', bg: '0' });
  if (layout) params.set('layout', layout);

  const frameRef = useRef<HTMLIFrameElement>(null);
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin === window.location.origin && e.source === frameRef.current?.contentWindow && e.data?.type === 'beginso-preview-drawn') setDrawn(true);
    };
    window.addEventListener('message', onMessage);
    const timer = window.setTimeout(() => setDrawn(true), GIVE_UP_MS);
    return () => {
      window.removeEventListener('message', onMessage);
      window.clearTimeout(timer);
    };
  }, []);

  return (
    <div className="flex h-full items-center justify-center">
      <div data-device={device} className="relative box-content shrink-0 overflow-hidden border-solid border-slate-800 transition-all duration-700 ease-in-out" style={SCREENS[device]}>
        <iframe
          ref={frameRef}
          title={title}
          src={`/forms/${formId}/preview?${params.toString()}`}
          className={bx('block size-full border-0 bg-transparent transition-opacity duration-300', drawn ? 'opacity-100' : 'opacity-0')}
        />
        {!drawn && (
          <div role="status" aria-label="Loading the preview" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="mx-auto flex max-w-160 flex-col gap-4 px-4 py-12">
              <Skeleton variant="title" width="60%" height={32} />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} variant="block" width="100%" height={56} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
