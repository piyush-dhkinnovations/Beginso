'use client';

import type { PreviewDevice } from './DeviceToggle';
import { DEVICE_WIDTH } from './DeviceToggle';

// Renders the respondent view in a same-origin <iframe> (`/forms/[id]/preview?embed=1`). An iframe,
// not a width-constrained div, so the form's real @media breakpoints respond to the chosen device
// width (same reasoning as /dev/ui/frame), and so the form's own light theme stays isolated from
// whatever theme the admin chrome around it is in (CF2.11).
export interface PreviewFrameProps {
  formId: string;
  device: PreviewDevice;
  /** Overrides the form's saved layout — used by the layout gallery to preview a preset before Use. */
  layout?: string;
  title: string;
}

export function PreviewFrame({ formId, device, layout, title }: PreviewFrameProps) {
  const params = new URLSearchParams({ embed: '1' });
  if (layout) params.set('layout', layout);

  return (
    <iframe
      title={title}
      src={`/forms/${formId}/preview?${params.toString()}`}
      className="h-full border border-(--border-default) rounded-lg bg-(--surface-card) shadow-(--shadow-md)"
      style={{ width: DEVICE_WIDTH[device], maxWidth: '100%' }}
    />
  );
}
