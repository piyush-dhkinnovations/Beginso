import type { CSSProperties, ReactNode } from 'react';
import type { LayoutPreset } from '@/types/form';
import type { PublicFormBranding } from '@/types/publicForm';
import { UNSPLASH_HOME, brandFooterNote, brandCardClass, brandLookProps, brandTypeStyle, brandWashLayers, brandWashStyle, creditsToShow } from '@/lib/formTheme';
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

/** Page background + centring. The page is washed with the brand colour and the card is centred in the viewport, so a
 *  short form never floats at the top of an empty grey page. `min-h-screen` is dropped in preview so the shell never
 *  forces a second full-viewport box inside the preview frame. Also carries the form's typeface and type scale. */
export function Backdrop({ branding, previewMode, children }: { branding: PublicFormBranding; previewMode?: boolean; children: ReactNode }) {
  // A picture the owner darkened or blurred is drawn as layers behind the page (a CSS background cannot be blurred), so it is taken off the page's own style.
  const layers = brandWashLayers(branding);
  const style: CSSProperties = { ...brandWashStyle(branding), ...(layers ? { backgroundImage: 'none' } : {}), ...brandTypeStyle(branding) };
  return (
    <div className={`bg-form-type relative isolate flex flex-col ${previewMode ? 'min-h-full' : 'min-h-screen'}`} style={style}>
      {layers && (
        // fixed to the window (like the picture it replaces), and behind everything on the page; inside the studio's preview it stays inside the frame
        <div aria-hidden="true" className={`pointer-events-none -z-10 overflow-hidden ${previewMode ? 'absolute' : 'fixed'} inset-0`}>
          <div className="absolute inset-0" style={layers.image} />
          {layers.veil && <div className="absolute inset-0" style={layers.veil} />}
        </div>
      )}
      <LookScope branding={branding} className={`flex flex-1 justify-center items-start md:items-center ${branding.backgroundStyle === 'none' ? 'p-2' : 'p-4 md:p-10'}`}>
        {children}
      </LookScope>
      <FooterNote branding={branding} />
      <PhotoCredits branding={branding} />
      {!previewMode && <MadeWithBeginso />}
    </div>
  );
}

/** The owner's short line under the form (plain text, never markup), on a card-coloured pill so it reads on any page background. Nothing when there is none. */
export function FooterNote({ branding }: { branding: PublicFormBranding }) {
  const note = brandFooterNote(branding);
  if (!note) return null;
  return (
    <p className="mx-auto mb-2 max-w-xl px-4 text-center">
      <span className="inline-block rounded-xl bg-(--surface-card) px-4 py-2 bg-body-sm text-(--text-secondary)">{note}</span>
    </p>
  );
}

/** "Photo by <photographer> on Unsplash", for each Unsplash photo in use on the form (Unsplash's rule for using their photos). Nothing when there is none. */
export function PhotoCredits({ branding }: { branding: PublicFormBranding }) {
  const credits = creditsToShow(branding);
  if (credits.length === 0) return null;
  return (
    <p className="flex flex-wrap justify-center gap-x-3 gap-y-2 px-4 pb-16 md:pb-20">
      {credits.map((c) => (
        <span key={c.url} className="rounded-full bg-(--surface-card) px-5 py-2 text-center bg-body-sm text-(--text-secondary) shadow-(--shadow-sm)">
          Photo by{' '}
          <a href={c.url} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2 hover:text-(--text-primary)">
            {c.name}
          </a>{' '}
          on{' '}
          <a href={UNSPLASH_HOME} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2 hover:text-(--text-primary)">
            Unsplash
          </a>
        </span>
      ))}
    </p>
  );
}

/** The element around the card: carries the owner's colours, fields look and exact values (see brandLookProps) without touching the page behind it or the "Made with" pill. */
export function LookScope({ branding, className, children }: { branding: PublicFormBranding; className?: string; children: ReactNode }) {
  const { className: lookClass, style, ...attrs } = brandLookProps(branding);
  return (
    <div {...attrs} className={`${lookClass} ${className ?? ''}`} style={style}>
      {children}
    </div>
  );
}

/** "Made with Beginso", under every form a respondent sees: the wordmark in a pill (readable on any page colour) that opens the main website.
 *  A new tab, so it never replaces a form someone is half way through, and works inside an embed iframe. On a phone it sits in the page, centred
 *  under the form: floating at the corner it covered the Submit button. From tablet width up there is room, so it floats at the bottom-right. */
function MadeWithBeginso() {
  return (
    <div className="flex justify-center px-4 pb-6 pt-2 md:fixed md:bottom-6 md:right-6 md:z-50 md:p-0">
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
  chat: { narrow: 'max-w-md', standard: 'max-w-lg', wide: 'max-w-2xl' },
  sidebar: { narrow: 'max-w-3xl', standard: 'max-w-5xl', wide: 'max-w-6xl' },
  open: { narrow: 'max-w-xl', standard: 'max-w-2xl', wide: 'max-w-4xl' },
  focus: { narrow: 'max-w-lg', standard: 'max-w-xl', wide: 'max-w-3xl' },
};
export const widthClass = (layout: LayoutPreset, branding: PublicFormBranding) => `form-width ${WIDTHS[layout][branding.formWidth ?? 'standard']}`;

/** The form card: surface chosen by the owner's card style. */
export const cardClass = (branding: PublicFormBranding, extra = '') => `${brandCardClass(branding)} w-full ${extra}`;

/** Layouts that ask one question at a time (the shell shows a single field, with Back, and a review before submit). */
export const ONE_AT_A_TIME: readonly LayoutPreset[] = ['guided', 'chat', 'focus'];
export const isOneAtATime = (layout: LayoutPreset) => ONE_AT_A_TIME.includes(layout);

/** Short fields pair up into two columns by default; the owner can switch to a single column, and one-at-a-time layouts are always one. */
export const isGrouped = (layout: LayoutPreset, grouping: PublicFormBranding['fieldGrouping']) =>
  layout === 'compact' || (!isOneAtATime(layout) && grouping !== 'single');

/** How the fields inside the form body are arranged for each preset. */
export function fieldsClassFor(layout: LayoutPreset, spacing: PublicFormBranding['spacing'] = 'comfortable', grouping: PublicFormBranding['fieldGrouping'] = 'auto'): string {
  // Sprint 13 (CF2.3): the owner's spacing choice sets the vertical rhythm between fields.
  const gap = spacing === 'compact' ? 'gap-3' : spacing === 'spacious' ? 'gap-7' : 'gap-4';
  const gapY = spacing === 'compact' ? 'gap-y-3' : spacing === 'spacious' ? 'gap-y-7' : 'gap-y-4';
  return isGrouped(layout, grouping)
    ? `form-fields mt-6 grid grid-cols-1 md:grid-cols-2 gap-x-5 ${gapY}` // two columns, forced to one below 768
    : `form-fields mt-6 flex flex-col ${gap}`;
}
