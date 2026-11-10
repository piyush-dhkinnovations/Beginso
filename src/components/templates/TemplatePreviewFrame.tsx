'use client';

import { useWidth } from '@/components/ui/charts/useWidth';
import { DEVICE_WIDTH, type PreviewDevice } from '@/components/preview/DeviceToggle';

// Same technique LiveFormPreview.tsx already uses for the Branding studio's device preview: the iframe is
// rendered at the device's REAL pixel width (so its @media breakpoints respond correctly — an iframe has
// its own independent viewport, a width-constrained div never does), then visually scaled with a measured
// CSS transform to fit whatever width the stage actually has. The stage itself — the box this sits in —
// never changes size when the device changes; only the form inside it does, same as switching a photo's
// zoom level rather than resizing the frame around it.
const STAGE_HEIGHT = 900;

export interface TemplatePreviewFrameProps {
  slug: string;
  device: PreviewDevice;
  title: string;
}

export function TemplatePreviewFrame({ slug, device, title }: TemplatePreviewFrameProps) {
  const [stageRef, stageWidth] = useWidth(0);
  const baseWidth = DEVICE_WIDTH[device];
  const scale = stageWidth > 0 ? Math.min(1, stageWidth / baseWidth) : 1;

  return (
    <div ref={stageRef} className="h-full w-full overflow-hidden">
      <iframe
        title={title}
        src={`/discover-templates/${slug}/preview`}
        className="origin-top-left border border-(--border-default) rounded-lg bg-(--surface-card) shadow-(--shadow-md)"
        style={{ width: baseWidth, height: STAGE_HEIGHT, transform: `scale(${scale})` }}
      />
    </div>
  );
}
