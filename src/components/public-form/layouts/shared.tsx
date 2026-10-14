import type { CSSProperties, ReactNode } from 'react';
import type { LayoutPreset } from '@/types/form';
import type { PublicFormBranding } from '@/types/publicForm';
import { brandCardClass, brandTypeStyle, brandWashStyle } from '@/lib/formTheme';
import { Wordmark } from '@/components/landing/Wordmark';

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
  /** Embed ?cover=0: no banner / cover image. */
  hideCover?: boolean;
  /** Embed ?progress=0: no step list / question counter. */
  hideProgress?: boolean;
  children: ReactNode;
}

export const DEFAULT_PRIMARY = '#1D4ED8';

/** Page background + centring. The page is washed with the brand colour and the card is centred in the viewport, so a
 *  short form never floats at the top of an empty grey page. `min-h-screen` is dropped in preview so the shell never
 *  forces a second full-viewport box inside the preview frame. Also carries the form's typeface and type scale. */
export function Backdrop({ branding, previewMode, children }: { branding: PublicFormBranding; previewMode?: boolean; children: ReactNode }) {
  const style: CSSProperties = { ...brandWashStyle(branding), ...brandTypeStyle(branding) };
  return (
    <div className={`flex flex-col ${previewMode ? 'min-h-full' : 'min-h-screen'}`} style={style}>
      <div className={`flex flex-1 justify-center items-start md:items-center ${branding.backgroundStyle === 'none' ? 'p-2' : 'p-4 md:p-10'}`}>
        {children}
      </div>
      {!previewMode && <MadeWithBeginso />}
    </div>
  );
}

/** "Made with Beginso", under every form a respondent sees: the wordmark in a pill at the bottom-right (readable on any page colour) that opens
 *  the main website. A new tab, so it never replaces a form someone is half way through, and works inside an embed iframe. */
function MadeWithBeginso() {
  return (
    <div className="flex justify-end px-4 pb-5 md:px-10">
      <a
        href="/"
        target="_blank"
        rel="noopener"
        aria-label="Made with Beginso (opens the Beginso website)"
        className="inline-flex items-center gap-2.5 rounded-full border border-(--border-default) bg-(--surface-card) px-4 py-2 bg-body-sm text-(--text-muted) shadow-(--shadow-sm) transition-colors hover:text-(--text-primary)"
      >
        Made with
        <Wordmark height={24} />
      </a>
    </div>
  );
}

// The card's maximum width per layout and per the owner's width choice (narrow / standard / wide). Written out in full so
// Tailwind sees every class; 'standard' is what every form had before the choice existed.
const WIDTHS: Record<LayoutPreset, Record<'narrow' | 'standard' | 'wide', string>> = {
  classic: { narrow: 'max-w-xl', standard: 'max-w-2xl', wide: 'max-w-4xl' },
  card_stack: { narrow: 'max-w-xl', standard: 'max-w-2xl', wide: 'max-w-4xl' },
  guided: { narrow: 'max-w-lg', standard: 'max-w-xl', wide: 'max-w-2xl' },
  steps: { narrow: 'max-w-2xl', standard: 'max-w-3xl', wide: 'max-w-5xl' },
  split_feature: { narrow: 'md:max-w-4xl', standard: 'md:max-w-6xl', wide: 'md:max-w-7xl' },
  compact: { narrow: 'max-w-2xl', standard: 'max-w-4xl', wide: 'max-w-6xl' },
};
export const widthClass = (layout: LayoutPreset, branding: PublicFormBranding) => WIDTHS[layout][branding.formWidth ?? 'standard'];

/** The form card: surface chosen by the owner's card style. */
export const cardClass = (branding: PublicFormBranding, extra = '') => `${brandCardClass(branding)} w-full ${extra}`;

/** Short fields pair up into two columns by default; the owner can switch to a single column, and Guided is always one. */
export const isGrouped = (layout: LayoutPreset, grouping: PublicFormBranding['fieldGrouping']) =>
  layout === 'compact' || (layout !== 'guided' && grouping !== 'single');

/** How the fields inside the form body are arranged for each preset. */
export function fieldsClassFor(layout: LayoutPreset, spacing: PublicFormBranding['spacing'] = 'comfortable', grouping: PublicFormBranding['fieldGrouping'] = 'auto'): string {
  // Sprint 13 (CF2.3): the owner's spacing choice sets the vertical rhythm between fields.
  const gap = spacing === 'compact' ? 'gap-3' : spacing === 'spacious' ? 'gap-7' : 'gap-4';
  const gapY = spacing === 'compact' ? 'gap-y-3' : spacing === 'spacious' ? 'gap-y-7' : 'gap-y-4';
  return isGrouped(layout, grouping)
    ? `mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-5 ${gapY}` // two columns, forced to one below 768
    : `mt-6 flex flex-col ${gap}`;
}
