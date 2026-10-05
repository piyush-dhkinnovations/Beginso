import type { CSSProperties } from 'react';
import type { FormBranding } from '@/types/form';

// Sprint 13 (CF2.3). The ONE place a branding choice becomes CSS, shared by the editor's live preview and the real
// public form so they cannot drift. Everything is optional; an absent value is the default.
type Theme = Pick<FormBranding, 'primaryColor' | 'buttonStyle' | 'buttonRadius' | 'coverPosition' | 'spacing' | 'showProgress'>;

const DEFAULT_COLOR = '#1D4ED8';

/** Inline style for the primary action button: solid fill, or outline in the brand colour. */
export function brandButtonStyle(b: Theme): CSSProperties {
  const color = b.primaryColor ?? DEFAULT_COLOR;
  const radius = b.buttonRadius ?? '8px';
  return b.buttonStyle === 'outline'
    ? { backgroundColor: '#FFFFFF', color, border: `1.5px solid ${color}`, borderRadius: radius }
    : { backgroundColor: color, color: '#FFFFFF', border: `1.5px solid ${color}`, borderRadius: radius };
}

/** Where a cover image is cropped when it does not fit the banner. */
export function brandCoverObjectPosition(b: Theme): string {
  return b.coverPosition === 'top' ? 'top' : b.coverPosition === 'bottom' ? 'bottom' : 'center';
}

/** Vertical rhythm between fields. */
export function brandGapClass(b: Theme): string {
  return b.spacing === 'compact' ? 'gap-2' : b.spacing === 'spacious' ? 'gap-6' : 'gap-4';
}

/** The multi-page progress indicator is on unless explicitly switched off. */
export const brandShowsProgress = (b: Theme): boolean => b.showProgress !== false;
