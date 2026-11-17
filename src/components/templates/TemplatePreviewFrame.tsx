'use client';

import { useCallback, useState, type CSSProperties } from 'react';
import { DEVICE_WIDTH, type PreviewDevice } from '@/components/preview/DeviceToggle';

// Same technique LiveFormPreview.tsx already uses for the Branding studio's device preview: the iframe is rendered at the device's REAL pixel
// width (so its @media breakpoints respond correctly: an iframe has its own independent viewport, a width-constrained div never does).
//
// ONE box, not two. The stage carries the form's own page (its colour, gradient or picture, passed in as `pageStyle`) over its whole area,
// whatever the device. The iframe inside it is see-through (`?embed=1&bg=0`), so only the FORM changes size: full width on a desktop, 768 px
// on a tablet, 375 px on a phone, centred on the same page. Nothing is cropped to the device's width.
const FALLBACK_HEIGHT = 600;

function useSize(): [(node: HTMLElement | null) => void, { w: number; h: number }] {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const ref = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const measure = () => setSize({ w: Math.round(node.clientWidth), h: Math.round(node.clientHeight) });
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, size];
}

export interface TemplatePreviewFrameProps {
  slug: string;
  device: PreviewDevice;
  title: string;
  /** The form's own page behind it (lib/formTheme.ts brandWashStyle), drawn over the whole stage. */
  pageStyle?: CSSProperties;
}

export function TemplatePreviewFrame({ slug, device, title, pageStyle }: TemplatePreviewFrameProps) {
  const [stageRef, { w, h }] = useSize();
  const baseWidth = DEVICE_WIDTH[device];
  // A desktop form is as wide as the stage (real size); a tablet or phone keeps its real width, scaled down only if the stage is narrower.
  const desktop = device === 'desktop' && w > 0;
  const scale = desktop ? 1 : w > 0 ? Math.min(1, w / baseWidth) : 1;
  const frameWidth = desktop ? w : baseWidth;
  const height = h > 0 ? h : FALLBACK_HEIGHT;

  return (
    <div
      ref={stageRef}
      className="h-full min-h-96 w-full overflow-hidden rounded-2xl border border-(--border-default) bg-(--bg-subtle)"
      style={{ ...pageStyle, backgroundAttachment: 'scroll' }}
    >
      <div className="mx-auto" style={{ width: Math.round(frameWidth * scale), height }}>
        <iframe
          title={title}
          src={`/discover-templates/${slug}/preview?embed=1&bg=0`}
          className="block origin-top-left border-0 bg-transparent"
          style={{ width: frameWidth, height: Math.round(height / scale), transform: `scale(${scale})` }}
        />
      </div>
    </div>
  );
}
