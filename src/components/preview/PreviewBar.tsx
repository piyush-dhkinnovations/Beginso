'use client';

import Link from 'next/link';
import { ArrowLeft, Eye, Monitor, Smartphone, Tablet } from 'lucide-react';
import { SegmentedRadio } from '@/components/ui/SegmentedRadio';
import type { PreviewDevice } from './DeviceToggle';

// The preview's only chrome: a small control floating over the corner of the form, so the form has the whole screen.
// Rendered only by the preview route, never by /f/[slug].
export interface PreviewBarProps {
  device: PreviewDevice;
  onDeviceChange: (device: PreviewDevice) => void;
  backHref: string;
}

const DEVICES = [
  { id: 'desktop', label: 'Desktop', title: 'Desktop', icon: <Monitor size={16} aria-hidden="true" /> },
  { id: 'tablet', label: 'Tablet', title: 'Tablet', icon: <Tablet size={16} aria-hidden="true" /> },
  { id: 'mobile', label: 'Mobile', title: 'Mobile', icon: <Smartphone size={16} aria-hidden="true" /> },
];

/** The floating control over a preview: this one's and the Branding studio's. */
export const FLOATING_BAR = 'absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full border border-(--border-default) bg-(--surface-card) p-1 text-(--text-primary) shadow-(--shadow-md)';

/** Desktop, Tablet, Mobile as icons. */
export function DeviceSwitch({ device, onChange }: { device: PreviewDevice; onChange: (device: PreviewDevice) => void }) {
  // Round all the way through, like the bar around it ("!": the segmented control brings its own, squarer corners).
  return <SegmentedRadio ariaLabel="Preview device" value={device} options={DEVICES} onChange={(id) => onChange(id as PreviewDevice)} iconOnlyBelow="all" className="rounded-full! [&>button]:rounded-full!" />;
}

export function PreviewBar({ device, onDeviceChange, backHref }: PreviewBarProps) {
  return (
    <div className={FLOATING_BAR}>
      <Link
        href={backHref}
        aria-label="Back to editor"
        title="Back to editor"
        className="flex size-11 items-center justify-center rounded-full text-(--text-secondary) transition-colors hover:bg-(--surface-hover) hover:text-(--text-primary) md:size-9"
      >
        <ArrowLeft size={18} aria-hidden="true" />
      </Link>
      {/* A phone's own screen is the narrow view already. */}
      <div className="hidden md:flex">
        <DeviceSwitch device={device} onChange={onDeviceChange} />
      </div>
      <span title="Respondents see this exactly as shown. Nothing is submitted." className="flex items-center gap-1.5 px-2 bg-body-sm font-semibold">
        <Eye size={14} aria-hidden="true" />
        Preview
      </span>
    </div>
  );
}
