'use client';

import Link from 'next/link';
import { ArrowLeft, Eye } from 'lucide-react';
import { DeviceToggle, type PreviewDevice } from './DeviceToggle';

// Sprint 13 (CF2.10), requirements.md 3.1 / design.md §15.4. Admin chrome — stays in the admin
// theme; the form it frames renders in its own (PreviewFrame). Rendered only by the preview route,
// never by /f/[slug] (3.2). The "nothing is submitted" note is visible from first paint.
export interface PreviewBarProps {
  device: PreviewDevice;
  onDeviceChange: (device: PreviewDevice) => void;
  backHref: string;
}

export function PreviewBar({ device, onDeviceChange, backHref }: PreviewBarProps) {
  return (
    <div className="shrink-0 bg-(--surface-inverse) text-(--text-on-brand)">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2">
        <span className="flex items-center gap-1.5 bg-body-sm font-semibold">
          <Eye size={14} aria-hidden="true" />
          Preview mode
        </span>
        {/* On its own card surface so the tabs read in both themes against the inverse bar. */}
        <div className="hidden md:block rounded-md bg-(--surface-card) px-2 text-(--text-primary)">
          <DeviceToggle device={device} onChange={onDeviceChange} />
        </div>
        <Link
          href={backHref}
          className="flex min-h-11 items-center gap-1.5 px-2 bg-body-sm font-semibold transition-colors hover:underline"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to editor
        </Link>
      </div>
      <p className="px-4 pb-2 bg-caption text-(--text-disabled)">Respondents see this exactly as shown. Nothing is submitted.</p>
    </div>
  );
}
