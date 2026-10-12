import type { CSSProperties } from 'react';
import type { FormBranding } from '@/types/form';
import { safeHttpUrl } from '@/lib/fieldDisplay';

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

// ── Respondent-form look: font, type scale, card surface, colour panel ─────────────────────────────────────────────
type Look = Pick<FormBranding, 'primaryColor' | 'fontFamily' | 'typeScale' | 'cardStyle' | 'panelTreatment' | 'coverImageUrl'>;

export const FORM_FONT_OPTIONS: { value: NonNullable<FormBranding['fontFamily']>; label: string; stack: string }[] = [
  { value: 'dm_sans', label: 'DM Sans (default)', stack: 'var(--font-dm-sans), system-ui, sans-serif' },
  { value: 'inter', label: 'Inter — clean', stack: 'var(--font-inter), system-ui, sans-serif' },
  { value: 'work_sans', label: 'Work Sans — modern', stack: 'var(--font-work-sans), system-ui, sans-serif' },
  { value: 'lora', label: 'Lora — serif, formal', stack: 'var(--font-lora), Georgia, serif' },
  { value: 'nunito', label: 'Nunito — rounded, friendly', stack: 'var(--font-nunito), system-ui, sans-serif' },
];

// Inputs and labels never drop below 16px / 14px whatever the scale: only the headline moves a lot.
const SCALES = {
  compact: { headline: '1.375rem', body: '1rem' },
  default: { headline: '1.75rem', body: '1rem' },
  large: { headline: '2.25rem', body: '1.0625rem' },
} as const;

/** Wrapper style: typeface plus the CSS variables the layouts read for the headline / body size. */
export function brandTypeStyle(b: Look): CSSProperties {
  const stack = (FORM_FONT_OPTIONS.find((f) => f.value === b.fontFamily) ?? FORM_FONT_OPTIONS[0]).stack;
  const s = SCALES[b.typeScale ?? 'default'];
  // --bg-font-sans is the design system's own font variable: every label, heading and button reads it, so pointing it at the
  // chosen typeface changes the WHOLE form, not just the inputs that inherit.
  return { fontFamily: stack, fontSize: s.body, '--bg-font-sans': stack, '--form-headline': s.headline } as CSSProperties;
}

/** The form card's surface. */
export function brandCardClass(b: Look): string {
  const base = 'bg-(--surface-card) rounded-2xl overflow-hidden';
  switch (b.cardStyle) {
    case 'flat': return `${base}`;
    case 'bordered': return `${base} border-2 border-(--border-default)`;
    case 'elevated': return `${base} border border-(--border-subtle) shadow-xl`;
    default: return `${base} border border-(--border-default) shadow-(--shadow-sm)`;
  }
}

/** Background of the colour panel / banner / page wash. Solid, two-stop gradient from the brand colour, a dotted pattern, or the cover image under a scrim. */
export function brandPanelStyle(b: Look): CSSProperties {
  const c = b.primaryColor ?? DEFAULT_COLOR;
  switch (b.panelTreatment) {
    case 'gradient':
      return { backgroundColor: c, backgroundImage: `linear-gradient(135deg, ${c} 0%, color-mix(in srgb, ${c} 55%, #000) 100%)` };
    case 'pattern':
      return { backgroundColor: c, backgroundImage: 'radial-gradient(rgba(255,255,255,.22) 1.5px, transparent 1.5px)', backgroundSize: '18px 18px' };
    default:
      return { backgroundColor: c };
  }
}

export const PAGE_BACKGROUND_OPTIONS: { value: NonNullable<FormBranding['backgroundStyle']>; label: string }[] = [
  { value: 'wash', label: 'Soft glow (default)' },
  { value: 'plain', label: 'Plain light grey' },
  { value: 'solid', label: 'Solid colour' },
  { value: 'gradient', label: 'Gradient' },
  { value: 'mesh', label: 'Colour mesh' },
  { value: 'dots', label: 'Dots' },
  { value: 'grid', label: 'Grid lines' },
  { value: 'image', label: 'Your own image' },
];

/**
 * The fill of the PAGE behind the form card (never the card). Built from `backgroundColor`, falling back to the brand
 * colour. Patterns are drawn in the same hue at low strength so a card stays the clear foreground.
 */
export function brandWashStyle(b: Look & Pick<FormBranding, 'backgroundColor' | 'backgroundImageUrl'> & { backgroundStyle?: FormBranding['backgroundStyle'] | 'none' }): CSSProperties {
  const c = b.backgroundColor ?? b.primaryColor ?? DEFAULT_COLOR;
  // Mixed into the theme's own page colour (not a literal white), so patterns stay dark in a dark embed.
  const tint = (pct: number) => `color-mix(in srgb, ${c} ${pct}%, var(--bg-subtle))`;
  switch (b.backgroundStyle) {
    case 'none':
      return { backgroundColor: 'transparent' };
    case 'plain':
      return { backgroundColor: 'var(--bg-subtle)' };
    case 'image': {
      // Only an http(s) URL goes into the CSS, JSON-quoted, so a stored value can never break out of url().
      const url = safeHttpUrl(b.backgroundImageUrl)?.href;
      return url
        ? { backgroundColor: c, backgroundImage: `url(${JSON.stringify(url)})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }
        : { backgroundColor: tint(14) };
    }
    case 'solid':
      return { backgroundColor: c };
    case 'gradient':
      return { backgroundColor: c, backgroundImage: `linear-gradient(135deg, ${c} 0%, ${tint(35)} 100%)` };
    case 'mesh':
      return {
        backgroundColor: tint(14),
        backgroundImage: `radial-gradient(at 12% 8%, ${c} 0, transparent 45%), radial-gradient(at 88% 12%, ${tint(55)} 0, transparent 45%), radial-gradient(at 80% 90%, color-mix(in srgb, ${c} 70%, #f0abfc) 0, transparent 45%), radial-gradient(at 8% 85%, ${tint(40)} 0, transparent 45%)`,
      };
    case 'dots':
      return { backgroundColor: tint(8), backgroundImage: `radial-gradient(color-mix(in srgb, ${c} 35%, transparent) 1.5px, transparent 1.5px)`, backgroundSize: '22px 22px' };
    case 'grid':
      return {
        backgroundColor: tint(6),
        backgroundImage: `linear-gradient(color-mix(in srgb, ${c} 16%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, ${c} 16%, transparent) 1px, transparent 1px)`,
        backgroundSize: '32px 32px',
      };
    default:
      // 'wash': the soft glow of the brand colour in two corners.
      return { backgroundColor: 'var(--bg-subtle)', backgroundImage: `radial-gradient(60rem 36rem at 15% -10%, color-mix(in srgb, ${c} 16%, transparent), transparent 60%), radial-gradient(50rem 30rem at 100% 110%, color-mix(in srgb, ${c} 12%, transparent), transparent 60%)` };
  }
}
