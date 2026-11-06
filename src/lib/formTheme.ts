import type { CSSProperties } from 'react';
import type { CropMemo, FieldStyle, FormBranding, FormFont, FormTheme, LayoutPreset, PhotoCredit, ProgressStyle } from '@/types/form';
import { safeHttpUrl } from '@/lib/fieldDisplay';
import { uploadSrc } from '@/lib/uploadSrc';
import { isBuiltInPictureUrl } from '@/lib/formPictures';

// Sprint 13 (CF2.3). The ONE place a branding choice becomes CSS, shared by the editor's live preview and the real
// public form so they cannot drift. Everything is optional; an absent value is the default.
type Theme = Pick<FormBranding, 'primaryColor' | 'buttonStyle' | 'buttonRadius' | 'coverPosition' | 'spacing' | 'showProgress' | 'theme'>;

const DEFAULT_COLOR = '#1D4ED8';

/** Inline style for the primary action button: solid fill, or outline in the brand colour. */
export function brandButtonStyle(b: Theme): CSSProperties {
  const color = b.primaryColor ?? DEFAULT_COLOR;
  const radius = b.buttonRadius ?? '8px';
  return b.buttonStyle === 'outline'
    ? { backgroundColor: '#FFFFFF', color, border: `1.5px solid ${color}`, borderRadius: radius }
    : { backgroundColor: color, color: cleanTheme(b.theme)?.colors?.buttonText ?? '#FFFFFF', border: `1.5px solid ${color}`, borderRadius: radius };
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

export type FontGroup = 'modern' | 'serif' | 'friendly' | 'display';
export const FONT_GROUPS: { id: FontGroup; label: string }[] = [
  { id: 'modern', label: 'Modern' },
  { id: 'serif', label: 'Serif' },
  { id: 'friendly', label: 'Friendly' },
  { id: 'display', label: 'Handwritten and display' },
];

export const FORM_FONT_OPTIONS: { value: FormFont; label: string; group: FontGroup; stack: string }[] = [
  { value: 'dm_sans', label: 'DM Sans (default)', group: 'modern', stack: 'var(--font-dm-sans), system-ui, sans-serif' },
  { value: 'inter', label: 'Inter — clean', group: 'modern', stack: 'var(--font-inter), system-ui, sans-serif' },
  { value: 'work_sans', label: 'Work Sans — modern', group: 'modern', stack: 'var(--font-work-sans), system-ui, sans-serif' },
  { value: 'lora', label: 'Lora — serif, formal', group: 'serif', stack: 'var(--font-lora), Georgia, serif' },
  { value: 'nunito', label: 'Nunito — rounded, friendly', group: 'friendly', stack: 'var(--font-nunito), system-ui, sans-serif' },
  { value: 'poppins', label: 'Poppins — geometric', group: 'modern', stack: 'var(--font-poppins), system-ui, sans-serif' },
  { value: 'manrope', label: 'Manrope — crisp', group: 'modern', stack: 'var(--font-manrope), system-ui, sans-serif' },
  { value: 'plus_jakarta_sans', label: 'Plus Jakarta Sans — friendly modern', group: 'modern', stack: 'var(--font-plus-jakarta-sans), system-ui, sans-serif' },
  { value: 'outfit', label: 'Outfit — clean geometric', group: 'modern', stack: 'var(--font-outfit), system-ui, sans-serif' },
  { value: 'space_grotesk', label: 'Space Grotesk — techy', group: 'modern', stack: 'var(--font-space-grotesk), system-ui, sans-serif' },
  { value: 'montserrat', label: 'Montserrat — bold, urban', group: 'modern', stack: 'var(--font-montserrat), system-ui, sans-serif' },
  { value: 'playfair_display', label: 'Playfair Display — elegant', group: 'serif', stack: 'var(--font-playfair-display), Georgia, serif' },
  { value: 'merriweather', label: 'Merriweather — readable serif', group: 'serif', stack: 'var(--font-merriweather), Georgia, serif' },
  { value: 'source_serif_4', label: 'Source Serif — editorial', group: 'serif', stack: 'var(--font-source-serif-4), Georgia, serif' },
  { value: 'fraunces', label: 'Fraunces — soft, warm serif', group: 'serif', stack: 'var(--font-fraunces), Georgia, serif' },
  { value: 'dm_serif_display', label: 'DM Serif Display — headline serif', group: 'serif', stack: 'var(--font-dm-serif-display), Georgia, serif' },
  { value: 'quicksand', label: 'Quicksand — light, rounded', group: 'friendly', stack: 'var(--font-quicksand), system-ui, sans-serif' },
  { value: 'fredoka', label: 'Fredoka — playful', group: 'friendly', stack: 'var(--font-fredoka), system-ui, sans-serif' },
  { value: 'caveat', label: 'Caveat — handwritten', group: 'display', stack: 'var(--font-caveat), cursive' },
  { value: 'pacifico', label: 'Pacifico — brush script', group: 'display', stack: 'var(--font-pacifico), cursive' },
  { value: 'bebas_neue', label: 'Bebas Neue — tall caps', group: 'display', stack: 'var(--font-bebas-neue), Impact, sans-serif' },
  { value: 'space_mono', label: 'Space Mono — monospace', group: 'display', stack: 'var(--font-space-mono), ui-monospace, monospace' },
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
  // chosen typeface changes the WHOLE form, not just the inputs that inherit. The wrapper must also have the class `bg-form-type`: the
  // type tokens (--text-h4, --text-label...) are worked out where they are declared, so that class declares them again under this wrapper.
  return { fontFamily: stack, fontSize: s.body, '--bg-font-sans': stack, '--form-headline': s.headline } as CSSProperties;
}

/** The form card's surface. */
export function brandCardClass(b: Look): string {
  // Each one differs in its edge AND its corners, so the choice is plain to see on the form (a hairline or a faint shadow was not):
  //  flat: square, no edge, no shadow; soft: rounded with a soft shadow; bordered: a firm line in the brand colour; elevated: very round, floating.
  const base = 'form-card bg-(--surface-card) overflow-hidden';
  switch (b.cardStyle) {
    case 'flat': return `${base} rounded-none`;
    case 'bordered': return `${base} rounded-xl border-2 border-(--action-primary)`;
    case 'elevated': return `${base} rounded-3xl shadow-2xl ring-1 ring-black/5`;
    default: return `${base} rounded-2xl border border-(--border-subtle) shadow-lg`;
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
export function brandWashStyle(b: Look & Pick<FormBranding, 'backgroundColor' | 'backgroundImageUrl'> & { backgroundStyle?: FormBranding['backgroundStyle'] | 'none'; theme?: FormTheme | null }): CSSProperties {
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
      // an uploaded picture is asked for through the app (see uploadSrc); any other address must be http(s)
      const own = uploadSrc(b.backgroundImageUrl);
      // an upload is asked for through the app, a picture from the app's own library is its own path, any other address must be http(s)
      const url = own?.startsWith('/api/backend/') ? own : isBuiltInPictureUrl(b.backgroundImageUrl) ? b.backgroundImageUrl : safeHttpUrl(b.backgroundImageUrl)?.href;
      return url
        ? { backgroundColor: c, backgroundImage: `url(${JSON.stringify(url)})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundAttachment: 'fixed' }
        : { backgroundColor: tint(14) };
    }
    case 'solid':
      return { backgroundColor: c };
    case 'gradient': {
      // the owner's two colours and angle when they chose them; otherwise the page colour fading into a tint of itself, at 135 degrees, as it always was
      const g = cleanTheme(b.theme)?.background;
      return { backgroundColor: g?.from ?? c, backgroundImage: `linear-gradient(${g?.angle ?? 135}deg, ${g?.from ?? c} 0%, ${g?.to ?? tint(35)} 100%)` };
    }
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

/** The picture behind the page as an address that is safe to put in a style, or nothing. */
function pageImageUrl(b: Pick<FormBranding, 'backgroundImageUrl'>): string | undefined {
  // an uploaded picture is asked for through the app (see uploadSrc), a picture from the app's own library is its own path, any other address must be http(s)
  const own = uploadSrc(b.backgroundImageUrl);
  return own?.startsWith('/api/backend/') ? own : isBuiltInPictureUrl(b.backgroundImageUrl) ? b.backgroundImageUrl : safeHttpUrl(b.backgroundImageUrl)?.href;
}

/**
 * A picture behind the page that is darkened and/or blurred is drawn as two layers (the picture, blurred; a dark veil over it), because a CSS background
 * cannot be blurred. Null when the page is not a picture, or the owner has not darkened or blurred it: the page then draws its picture as before.
 */
export function brandWashLayers(b: Pick<FormBranding, 'backgroundImageUrl' | 'theme'> & { backgroundStyle?: string }): { image: CSSProperties; veil?: CSSProperties } | null {
  if (b.backgroundStyle !== 'image') return null;
  const g = cleanTheme(b.theme)?.background;
  if (!g?.darken && !g?.blur) return null;
  const url = pageImageUrl(b);
  if (!url) return null;
  return {
    image: {
      backgroundImage: `url(${JSON.stringify(url)})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      // scaled up a little so the blurred edge does not show a pale rim
      ...(g.blur ? { filter: `blur(${g.blur}px)`, transform: 'scale(1.08)' } : {}),
    },
    veil: g.darken ? { backgroundColor: `rgba(0, 0, 0, ${(g.darken / 100).toFixed(2)})` } : undefined,
  };
}

/** The cover banner's own height in pixels, when the owner chose one. */
export const brandCoverHeight = (b: Pick<FormBranding, 'theme'>): number | undefined => cleanTheme(b.theme)?.cover?.height;

// ── Colours, fields look and exact sizes (branding.theme) ─────────────────────────────────────────────────────────────────────────────────
// ONE code path for the public form, the builder's live preview and the studio's own tiles. Every key is optional; a form with no theme gets
// no inline style and no data attribute from here, and the CSS for them (beginso-ui.css) only matches when the attribute is there, so it is
// drawn exactly as it was before the theme existed.

const THEME_HEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
const THEME_ENUMS = { style: ['outlined', 'filled', 'underline'], label: ['above', 'start'], choice: ['plain', 'tiles'] } as const;
// the same limits the backend enforces (whole numbers, inclusive)
const THEME_NUMBERS = {
  fields: { radius: [0, 32] },
  card: { radius: [0, 40], shadow: [0, 100] },
  layout: { maxWidth: [360, 1400], fieldGap: [4, 64] },
  background: { angle: [0, 360], darken: [0, 80], blur: [0, 20] },
  cover: { height: [120, 480] },
} as const;
const THEME_COLOURS = ['text', 'heading', 'card', 'field', 'fieldBorder', 'buttonText'] as const;

/**
 * The theme with only what is safe to draw: version 1, hex colours, known options, whole numbers in range. Everything else is dropped. This runs
 * before a theme becomes CSS or is saved, whatever the server sent or the editor held, so a raw string never reaches a style.
 */
export function cleanTheme(raw: unknown): FormTheme | undefined {
  if (!raw || typeof raw !== 'object' || (raw as { v?: unknown }).v !== 1) return undefined;
  const t = raw as Record<string, Record<string, unknown> | undefined>;
  const out: Record<string, Record<string, unknown>> = {};
  const colors: Record<string, unknown> = {};
  for (const k of THEME_COLOURS) {
    const v = t.colors?.[k];
    if (typeof v === 'string' && THEME_HEX.test(v)) colors[k] = v;
  }
  if (Object.keys(colors).length) out.colors = colors;
  for (const [group, keys] of Object.entries(THEME_NUMBERS)) {
    const g: Record<string, unknown> = {};
    for (const [k, [min, max]] of Object.entries(keys)) {
      const v = t[group]?.[k];
      if (typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max) g[k] = v;
    }
    if (group === 'background') {
      for (const k of ['from', 'to'] as const) {
        const v = t.background?.[k];
        if (typeof v === 'string' && THEME_HEX.test(v)) g[k] = v;
      }
    }
    if (group === 'layout' && t.layout?.panelSide !== undefined && ['start', 'end'].includes(t.layout.panelSide as string)) g.panelSide = t.layout.panelSide;
    if (group === 'fields') {
      for (const [k, allowed] of Object.entries(THEME_ENUMS)) {
        const v = t.fields?.[k];
        if (typeof v === 'string' && (allowed as readonly string[]).includes(v)) g[k] = v;
      }
    }
    if (Object.keys(g).length) out[group] = g;
  }
  const heading = t.fonts?.heading;
  if (typeof heading === 'string' && FORM_FONT_OPTIONS.some((f) => f.value === heading)) out.fonts = { heading };
  const credit: Record<string, PhotoCredit> = {};
  for (const slot of ['cover', 'background'] as const) {
    const c = cleanCredit((t.credit as Record<string, unknown> | undefined)?.[slot]);
    if (c) credit[slot] = c;
  }
  if (Object.keys(credit).length) out.credit = credit;
  const buttons: Record<string, unknown> = {};
  for (const [k, allowed] of Object.entries(THEME_BUTTONS)) {
    const v = t.buttons?.[k];
    if (typeof v === 'string' && (allowed as readonly string[]).includes(v)) buttons[k] = v;
  }
  if (Object.keys(buttons).length) out.buttons = buttons;
  const labels: Record<string, unknown> = {};
  for (const k of ['submit', 'next', 'back'] as const) {
    const v = cleanText(t.labels?.[k], LABEL_MAX);
    if (v) labels[k] = v;
  }
  if (Object.keys(labels).length) out.labels = labels;
  const progressStyle = t.progress?.style;
  if (typeof progressStyle === 'string' && (THEME_PROGRESS as readonly string[]).includes(progressStyle)) out.progress = { style: progressStyle };
  const note = cleanText(t.footer?.note, FOOTER_MAX);
  if (note) out.footer = { note };
  const success = cleanSuccess(t.success);
  if (success) out.success = success;
  const crop: Record<string, CropMemo> = {};
  for (const slot of ['cover', 'background', 'logo'] as const) {
    const memo = cleanMemo((t.crop as Record<string, unknown> | undefined)?.[slot]);
    if (memo) crop[slot] = memo;
  }
  if (Object.keys(crop).length) out.crop = crop;
  return Object.keys(out).length ? ({ v: 1, ...out } as FormTheme) : undefined;
}

export const LABEL_MAX = 30;
export const FOOTER_MAX = 200;
export const HEADLINE_MAX = 60;
export const REDIRECT_SECONDS = { min: 3, max: 30, default: 5 } as const;

/** An address the thank-you screen may send a respondent on to: https only, no credentials, no spaces, quotes or markup. Anything else is nothing. */
export function cleanRedirectUrl(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const v = raw.trim();
  if (!v || v.length > 500 || /["'<>\\\s]/.test(v)) return undefined;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && !u.username && !u.password && u.hostname.includes('.') ? v : undefined;
  } catch {
    return undefined;
  }
}

/** A picture address for the thank-you screen: one of our uploads, a built-in picture, or an https address; never anything that could leave an attribute. */
function cleanPicture(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const v = raw.trim();
  if (!v || v.length > 2048 || /["'()<>\\\s]/.test(v)) return undefined;
  if (v.startsWith('/api/upload/file/') || isBuiltInPictureUrl(v)) return v;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && !u.username && !u.password ? v : undefined;
  } catch {
    return undefined;
  }
}

/** A remembered crop: both pictures valid, and numbers in range. Anything else is nothing. */
function cleanMemo(raw: unknown): CropMemo | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const m = raw as Record<string, unknown>;
  const from = cleanPicture(m.from);
  const result = cleanPicture(m.result);
  const num = (v: unknown, min: number, max: number) => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : undefined);
  const aspect = num(m.aspect, 0.2, 10);
  const fx = num(m.fx, 0, 1);
  const fy = num(m.fy, 0, 1);
  const zoom = num(m.zoom, 1, 4);
  if (!from || !result || aspect === undefined || fx === undefined || fy === undefined || zoom === undefined) return undefined;
  return { from, result, aspect, fx, fy, zoom };
}

function cleanSuccess(raw: unknown): NonNullable<FormTheme['success']> | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const s = raw as Record<string, unknown>;
  const out: NonNullable<FormTheme['success']> = {};
  const headline = cleanText(s.headline, HEADLINE_MAX);
  if (headline) out.headline = headline;
  if (typeof s.colour === 'string' && THEME_HEX.test(s.colour)) out.colour = s.colour;
  const picture = cleanPicture(s.picture);
  if (picture) out.picture = picture;
  if (s.confetti === true) out.confetti = true;
  const redirect = s.redirect && typeof s.redirect === 'object' ? (s.redirect as Record<string, unknown>) : undefined;
  const url = cleanRedirectUrl(redirect?.url);
  if (url) {
    const seconds = redirect?.seconds;
    out.redirect = { url, ...(typeof seconds === 'number' && Number.isInteger(seconds) && seconds >= REDIRECT_SECONDS.min && seconds <= REDIRECT_SECONDS.max ? { seconds } : {}) };
  }
  return Object.keys(out).length ? out : undefined;
}

/** What the thank-you screen draws: the owner's own words, picture and colour, and where to send people on (with how long they have to stay). */
export function brandSuccess(b: Pick<FormBranding, 'theme'>): { headline?: string; colour?: string; picture?: string; confetti: boolean; redirect?: { url: string; seconds: number } } {
  const s = cleanTheme(b.theme)?.success;
  const own = uploadSrc(s?.picture);
  const picture = s?.picture ? (own?.startsWith('/api/backend/') ? own : isBuiltInPictureUrl(s.picture) ? s.picture : safeHttpUrl(s.picture)?.href) : undefined;
  return {
    headline: s?.headline,
    colour: s?.colour,
    picture,
    confetti: s?.confetti === true,
    redirect: s?.redirect ? { url: s.redirect.url, seconds: s.redirect.seconds ?? REDIRECT_SECONDS.default } : undefined,
  };
}
const THEME_BUTTONS = { size: ['small', 'default', 'large'], width: ['fill', 'auto'], hover: ['none', 'lift', 'darken'] } as const;
const THEME_PROGRESS = ['bar', 'dots', 'steps'] as const;

/** A short line of the owner's own words as the backend accepts it: trimmed, 1 to `max` characters, no control characters and no markup. Anything else is nothing. */
export function cleanText(raw: unknown, max: number): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const s = raw.trim();
  if (!s || s.length > max || /[\u0000-\u001f\u007f<>]/.test(s)) return undefined;
  return s;
}

const CREDIT_URL = /^https:\/\/unsplash\.com\/(@[A-Za-z0-9_.-]{1,60})?(\?[A-Za-z0-9_=&%.-]{0,120})?$/;

/** A photographer's credit as the backend accepts it: a name without control characters or markup, and an unsplash.com profile address. Anything else is nothing. */
export function cleanCredit(raw: unknown): PhotoCredit | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const { name, url } = raw as { name?: unknown; url?: unknown };
  if (typeof name !== 'string' || typeof url !== 'string') return undefined;
  const n = name.trim();
  if (!n || n.length > 80 || /[\u0000-\u001f\u007f<>]/.test(n) || url.length > 300 || !CREDIT_URL.test(url)) return undefined;
  return { name: n, url };
}

/** What each layout can show of the new options, and why not when it cannot. */
export type ThemeOption = 'fieldStyle' | 'fieldRadius' | 'labelPosition' | 'choiceStyle' | 'cardShape' | 'maxWidth' | 'panelSide' | 'progressStyle';

/** Layouts that draw their own progress (a step list, a question counter) instead of the shared bar, so a progress style has nothing to change there. */
export const OWN_PROGRESS: Partial<Record<LayoutPreset, string>> = {
  steps: 'Steps shows its own step list.',
  guided: 'Guided shows its own question counter.',
  chat: 'Chat shows its own question counter.',
  focus: 'Focus shows its own question counter.',
};

export const LABEL_BESIDE_UNSUPPORTED: Partial<Record<LayoutPreset, string>> = {
  guided: 'Guided shows one question per screen, so the label stays above it.',
  compact: 'Compact already sets fields in two columns, so the label stays above.',
  chat: 'Chat shows one question at a time, so the label stays above it.',
  focus: 'Focus shows one question at a time, so the label stays above it.',
};

/** The reason an option cannot be used with this layout (and field style), or undefined when it can. */
export function themeOptionBlocked(option: ThemeOption, layout: LayoutPreset, theme?: FormTheme | null): string | undefined {
  if (option === 'labelPosition') return LABEL_BESIDE_UNSUPPORTED[layout];
  if (option === 'panelSide' && layout !== 'split_feature') return 'Only the Split Feature layout has a picture panel.';
  if (option === 'fieldRadius' && theme?.fields?.style === 'underline') return 'Underline fields have no corners.';
  if (option === 'progressStyle') return OWN_PROGRESS[layout];
  return undefined;
}

/** The theme as this layout can actually draw it: an option the layout cannot show is left out, never half applied. */
export function effectiveTheme(layout: LayoutPreset, raw?: FormTheme | null): FormTheme | undefined {
  const theme = cleanTheme(raw);
  if (!theme) return undefined;
  const fields = { ...theme.fields };
  if (themeOptionBlocked('labelPosition', layout)) delete fields.label;
  if (themeOptionBlocked('fieldRadius', layout, theme)) delete fields.radius;
  const layoutGroup = { ...theme.layout };
  if (themeOptionBlocked('panelSide', layout)) delete layoutGroup.panelSide;
  const out: FormTheme = { ...theme, fields, layout: layoutGroup };
  if (themeOptionBlocked('progressStyle', layout)) delete out.progress;
  return out;
}

/** Sets or clears one key of one group; an emptied group, and an emptied theme, are removed so a form returns to having none. */
export function patchTheme<G extends 'colors' | 'fields' | 'card' | 'layout' | 'fonts' | 'buttons' | 'labels' | 'progress' | 'footer' | 'success' | 'background' | 'cover' | 'crop'>(theme: FormTheme | null | undefined, group: G, patch: Partial<NonNullable<FormTheme[G]>>): FormTheme | null {
  const next: FormTheme = { ...(theme ?? { v: 1 }), v: 1 };
  const merged: Record<string, unknown> = { ...(next[group] ?? {}), ...patch };
  for (const k of Object.keys(merged)) if (merged[k] === undefined) delete merged[k];
  if (Object.keys(merged).length) (next as unknown as Record<string, unknown>)[group] = merged;
  else delete next[group];
  return Object.keys(next).length > 1 ? next : null;
}

const mix = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, transparent)`;

/** A 0-100 shadow strength as a box-shadow: 0 is none, 100 is a deep, wide shadow. */
export const cardShadowValue = (strength: number): string => {
  const s = Math.max(0, Math.min(100, strength));
  return s === 0 ? 'none' : `0 ${Math.round(s * 0.3)}px ${Math.round(s * 0.8)}px rgba(0, 0, 0, ${(0.04 + s * 0.0021).toFixed(3)})`;
};

/** The class, inline style and data attributes for the element that wraps the form's card and fields. */
export function brandLookProps(b: Pick<FormBranding, 'theme'>): { className: string; style: CSSProperties; [attr: `data-${string}`]: string | undefined } {
  const t = cleanTheme(b.theme);
  const c = t?.colors;
  const f = t?.fields;
  const style: Record<string, string> = {};
  if (c?.text) {
    style['--text-primary'] = c.text;
    style['--text-secondary'] = mix(c.text, 82);
    style['--text-muted'] = mix(c.text, 62);
    // an opaque edge (not the see-through muted text), so a filled or underlined field keeps a line that can be seen
    style['--form-field-edge'] = `color-mix(in srgb, ${c.text} 72%, var(--surface-card))`;
  }
  if (c?.heading) {
    style['--form-heading'] = c.heading;
    style['--form-heading-header'] = c.heading; // set only when chosen: a title on the coloured header stays white otherwise
  }
  if (c?.card) style['--surface-card'] = c.card;
  if (c?.field) {
    style['--form-field-bg'] = c.field;
    style['--form-field-bg-filled'] = c.field;
  }
  if (c?.fieldBorder) {
    style['--form-field-border'] = c.fieldBorder;
    style['--form-field-edge'] = c.fieldBorder;
  }
  if (f?.radius !== undefined) style['--form-field-radius'] = `${f.radius}px`;
  if (t?.card?.radius !== undefined) style['--form-card-radius'] = `${t.card.radius}px`;
  if (t?.card?.shadow !== undefined) style['--form-card-shadow'] = cardShadowValue(t.card.shadow);
  if (t?.layout?.maxWidth !== undefined) style['--form-max-width'] = `${t.layout.maxWidth}px`;
  if (t?.layout?.fieldGap !== undefined) style['--form-field-gap'] = `${t.layout.fieldGap}px`;
  const headingFont = t?.fonts?.heading ? FORM_FONT_OPTIONS.find((f) => f.value === t.fonts?.heading)?.stack : undefined;
  if (headingFont) style['--form-heading-font'] = headingFont;
  const fieldStyle: FieldStyle | undefined = f?.style && f.style !== 'outlined' ? f.style : undefined;
  return {
    className: 'form-look',
    style: style as CSSProperties,
    'data-field-style': fieldStyle,
    'data-heading-font': headingFont ? '' : undefined,
    'data-label-start': f?.label === 'start' ? '' : undefined,
    'data-choice-tiles': f?.choice === 'tiles' ? '' : undefined,
    'data-card-radius': t?.card?.radius !== undefined ? '' : undefined,
    'data-card-shadow': t?.card?.shadow !== undefined ? '' : undefined,
    'data-max-width': t?.layout?.maxWidth !== undefined ? '' : undefined,
    'data-field-gap': t?.layout?.fieldGap !== undefined ? '' : undefined,
    'data-panel-end': t?.layout?.panelSide === 'end' ? '' : undefined,
    'data-btn-size': t?.buttons?.size && t.buttons.size !== 'default' ? t.buttons.size : undefined,
    'data-btn-width': t?.buttons?.width === 'auto' ? 'auto' : undefined,
    'data-btn-hover': t?.buttons?.hover && t.buttons.hover !== 'none' ? t.buttons.hover : undefined,
  };
}

/** The words on the form's three buttons: the owner's own, or Submit, Next and Back. */
export function brandLabels(b: Pick<FormBranding, 'theme'>): { submit: string; next: string; back: string } {
  const l = cleanTheme(b.theme)?.labels;
  return { submit: l?.submit ?? 'Submit', next: l?.next ?? 'Next', back: l?.back ?? 'Back' };
}

/** How the multi-page progress is drawn. */
export const brandProgressStyle = (b: Pick<FormBranding, 'theme'>): ProgressStyle => cleanTheme(b.theme)?.progress?.style ?? 'bar';

/** The short line under the form, if the owner wrote one. */
export const brandFooterNote = (b: Pick<FormBranding, 'theme'>): string | undefined => cleanTheme(b.theme)?.footer?.note;

// ── Photographer credit for Unsplash photos ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// Unsplash asks that a photo used from its library is credited with a link to the photographer and to Unsplash. The credit rides in the theme, one for the
// cover and one for the page background, and is shown on the form only while its photo is in use.

export const UNSPLASH_HOME = 'https://unsplash.com/?utm_source=beginso&utm_medium=referral';
export const isUnsplashImage = (url: string | null | undefined): url is string => typeof url === 'string' && url.startsWith('https://images.unsplash.com/');

/** The theme with one picture's credit set, or taken out when `credit` is undefined; an emptied theme is null (how a save clears it). */
export function withCredit(theme: FormTheme | null | undefined, slot: 'cover' | 'background', credit?: PhotoCredit): FormTheme | null {
  const next: FormTheme = { ...(theme ?? { v: 1 }), v: 1 };
  const credits = { ...next.credit };
  if (credit) credits[slot] = credit;
  else delete credits[slot];
  if (Object.keys(credits).length) next.credit = credits;
  else delete next.credit;
  return Object.keys(next).length > 1 ? next : null;
}

/** The credits to show on a form: one for each Unsplash picture actually in use (the cover, and the background while the page background is a picture). */
export function creditsToShow(b: Pick<FormBranding, 'theme' | 'coverImageUrl' | 'backgroundImageUrl'> & { backgroundStyle?: string }): PhotoCredit[] {
  const credit = cleanTheme(b.theme)?.credit;
  if (!credit) return [];
  const list: PhotoCredit[] = [];
  if (credit.cover && isUnsplashImage(b.coverImageUrl)) list.push(credit.cover);
  if (credit.background && b.backgroundStyle === 'image' && isUnsplashImage(b.backgroundImageUrl)) list.push(credit.background);
  return list.filter((c, i) => list.findIndex((o) => o.url === c.url) === i);
}
