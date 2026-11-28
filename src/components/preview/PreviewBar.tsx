'use client';

import Link from 'next/link';
import { ArrowLeft, Eye } from 'lucide-react';
import { DeviceToggle, type PreviewDevice } from './DeviceToggle';

// Admin chrome — stays in the admin
// theme; the form it frames renders in its own (PreviewFrame). Rendered only by the preview route,
// never by /f/[slug]. The "nothing is submitted" note is visible from first paint.
export interface PreviewBarProps {
  device: PreviewDevice;
  onDeviceChange: (device: PreviewDevice) => void;
  backHref: string;
  /** The form on screen includes changes that are not saved yet. */
  unsaved?: boolean;
}

export function PreviewBar({ device, onDeviceChange, backHref, unsaved = false }: PreviewBarProps) {
  return (
    <div className="shrink-0 bg-(--surface-inverse) text-(--text-on-brand)">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2">
        <span className="flex items-center gap-1.5 bg-body-sm font-semibold">
          <Eye size={14} aria-hidden="true" />
          Preview mode
          {unsaved && <span className="ml-1.5 rounded-full bg-(--warning-surface) px-2 py-0.5 bg-caption font-semibold text-(--warning-text)">Unsaved changes</span>}
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
      <p className="px-4 pb-2 bg-caption text-(--text-disabled)">
        {unsaved ? 'Only you can see these changes. Save them in the editor to keep them. Nothing is submitted.' : 'Respondents see this exactly as shown. Nothing is submitted.'}
      </p>
    </div>
  );
}
