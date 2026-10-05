import type { ReactNode } from 'react';
import type { LayoutPreset } from '@/types/form';
import type { PublicFormBranding } from '@/types/publicForm';

// Sprint 13 (CF2.7), design.md §7. Every layout is a presentation FRAME around the form body that
// PublicFormShell still owns (RHF state, validation, drafts, submit). A layout never holds form
// values; it only decides the chrome around them and how fields are arranged.
export interface LayoutFrameProps {
  layout: LayoutPreset;
  branding: PublicFormBranding;
  title: string;
  previewMode?: boolean;
  /** Step names, one per form page — Steps layout shows them; others ignore. */
  stepNames: string[];
  /** Zero-based index of the current page. */
  currentPage: number;
  /** Guided only — question N of M across the whole form. */
  question?: { current: number; total: number };
  children: ReactNode;
}

export const DEFAULT_PRIMARY = '#1D4ED8';

/** Page background + centring. `min-h-screen` is dropped in preview so the shell never forces a
 *  second full-viewport box inside the preview frame. */
export function Backdrop({ previewMode, children }: { previewMode?: boolean; children: ReactNode }) {
  return (
    <div className={`bg-(--bg-subtle) flex justify-center p-4 ${previewMode ? '' : 'min-h-screen'}`}>{children}</div>
  );
}

/** How the fields inside the form body are arranged for each preset. */
export function fieldsClassFor(layout: LayoutPreset, spacing: PublicFormBranding['spacing'] = 'comfortable'): string {
  // Sprint 13 (CF2.3): the owner's spacing choice sets the vertical rhythm between fields.
  const gap = spacing === 'compact' ? 'gap-3' : spacing === 'spacious' ? 'gap-8' : 'gap-5';
  const gapY = spacing === 'compact' ? 'gap-y-3' : spacing === 'spacious' ? 'gap-y-8' : 'gap-y-5';
  return layout === 'compact'
    ? `mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-5 ${gapY}` // two columns, forced to one below 768
    : `mt-6 flex flex-col ${gap}`;
}
