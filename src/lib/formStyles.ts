// A form's LOOK as something that can be kept and applied to another form: its layout and the branding that is about looks (colours, fonts, card,
// fields, background), without anything that belongs to one form (logo, icon, header text and links, an uploaded cover or background).
// "My styles" are saved through /api/form-styles; the ready-made gallery (GALLERY_STYLES) is code, no server needed.
import { cleanTheme } from '@/lib/formTheme';
import { isBuiltInPictureUrl } from '@/lib/formPictures';
import type { FormBranding, FormFont, FormTheme, LayoutPreset } from '@/types/form';

/** The branding keys a style carries. The images are handled on their own (only a library picture is kept). */
const STYLE_KEYS = [
  'primaryColor', 'buttonStyle', 'buttonRadius', 'showProgress', 'spacing', 'fontFamily', 'typeScale', 'cardStyle', 'panelTreatment', 'fieldGrouping',
  'backgroundStyle', 'backgroundColor', 'formWidth',
] as const satisfies readonly (keyof FormBranding)[];

export type StyleBranding = Pick<FormBranding, (typeof STYLE_KEYS)[number] | 'coverImageUrl' | 'backgroundImageUrl'> & { theme?: FormTheme };

export interface FormStyle {
  id: string;
  name: string;
  layout: LayoutPreset;
  branding: StyleBranding;
}

/** The look of a form as a style: the allowed keys only, the theme cleaned, and a picture only when it is one of the library's. */
export function snapshotStyle(layout: LayoutPreset, branding: FormBranding): { layout: LayoutPreset; branding: StyleBranding } {
  const out: Record<string, unknown> = {};
  for (const k of STYLE_KEYS) if (branding[k] !== undefined && branding[k] !== null) out[k] = branding[k];
  for (const k of ['coverImageUrl', 'backgroundImageUrl'] as const) if (isBuiltInPictureUrl(branding[k])) out[k] = branding[k];
  const theme = cleanTheme(branding.theme);
  if (theme) out.theme = theme;
  return { layout, branding: out as StyleBranding };
}

/**
 * What to set on a form to give it a style: every look key takes the style's value, or is cleared when the style does not name it (so the result is the
 * style, not the style mixed with what was there). The form's own uploads stay: a picture is only replaced by a library picture the style names, and
 * a library picture the form had is dropped when the style has none.
 */
export function styleUpdates(style: { branding: StyleBranding }, current: FormBranding): Partial<FormBranding> {
  const updates: Record<string, unknown> = {};
  for (const k of STYLE_KEYS) updates[k] = style.branding[k];
  for (const k of ['coverImageUrl', 'backgroundImageUrl'] as const) {
    updates[k] = style.branding[k] ?? (isBuiltInPictureUrl(current[k]) ? undefined : current[k]);
  }
  // null is how a save clears a theme on the server
  updates.theme = style.branding.theme ?? null;
  // a style that sets a page background colour or picture brings its own; one that does not leaves none behind
  return updates as Partial<FormBranding>;
}

/** The values of the style keys a form has now, in the shape styleUpdates produces, so applying a style can be undone exactly. */
export function currentLook(branding: FormBranding): Partial<FormBranding> {
  const out: Record<string, unknown> = {};
  for (const k of STYLE_KEYS) out[k] = branding[k];
  out.coverImageUrl = branding.coverImageUrl;
  out.backgroundImageUrl = branding.backgroundImageUrl;
  out.theme = branding.theme ?? null;
  return out as Partial<FormBranding>;
}

export const sameLook = (a: { layout: LayoutPreset; branding: StyleBranding }, b: { layout: LayoutPreset; branding: StyleBranding }): boolean =>
  a.layout === b.layout && JSON.stringify(sortKeys(a.branding)) === JSON.stringify(sortKeys(b.branding));

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([x], [y]) => x.localeCompare(y)).map(([k, v]) => [k, sortKeys(v)]));
  }
  return value;
}

// ── The ready-made gallery ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Each one is a whole look (layout, colours, typeface, card, fields, background). Colours are chosen to pass the studio's own readability checks
// (see __tests__/lib/formStyles.test.ts): text 4.5 to 1, a field border 3 to 1.

export interface GalleryStyle extends FormStyle {
  note: string;
}

const border = '#7B8498';
const font = (f: FormFont) => f;

export const GALLERY_STYLES: readonly GalleryStyle[] = [
  {
    id: 'clean',
    name: 'Clean',
    note: 'White and blue, nothing in the way.',
    layout: 'classic',
    branding: { primaryColor: '#1D4ED8', fontFamily: font('dm_sans'), cardStyle: 'soft', panelTreatment: 'solid', backgroundStyle: 'plain', theme: { v: 1, colors: { fieldBorder: border } } },
  },
  {
    id: 'corporate',
    name: 'Corporate',
    note: 'Steady navy, a firm border, a grid behind.',
    layout: 'steps',
    branding: { primaryColor: '#0F4C81', fontFamily: font('work_sans'), cardStyle: 'bordered', panelTreatment: 'solid', backgroundStyle: 'grid', theme: { v: 1, colors: { fieldBorder: border }, fields: { radius: 4 } } },
  },
  {
    id: 'editorial',
    name: 'Editorial',
    note: 'A serif headline, underlined fields.',
    layout: 'classic',
    branding: {
      primaryColor: '#111827',
      fontFamily: font('source_serif_4'),
      cardStyle: 'flat',
      panelTreatment: 'solid',
      backgroundStyle: 'plain',
      theme: { v: 1, colors: { fieldBorder: border }, fields: { style: 'underline' }, fonts: { heading: font('dm_serif_display') } },
    },
  },
  {
    id: 'playful',
    name: 'Playful',
    note: 'Rounded, pink and bouncy, answers as tiles.',
    layout: 'guided',
    branding: {
      primaryColor: '#C2185B',
      fontFamily: font('fredoka'),
      cardStyle: 'elevated',
      panelTreatment: 'gradient',
      backgroundStyle: 'mesh',
      theme: { v: 1, colors: { fieldBorder: border }, fields: { style: 'filled', radius: 20, choice: 'tiles' } },
    },
  },
  {
    id: 'midnight',
    name: 'Midnight',
    note: 'A dark card on a night sky.',
    layout: 'card_stack',
    branding: {
      primaryColor: '#8AB4FF',
      fontFamily: font('manrope'),
      cardStyle: 'soft',
      panelTreatment: 'solid',
      backgroundStyle: 'image',
      backgroundImageUrl: '/form-pictures/midnight-glow.jpg',
      theme: { v: 1, colors: { text: '#F3F4F6', card: '#111827', field: '#1F2937', fieldBorder: '#8A93A6', buttonText: '#0B1020' } },
    },
  },
  {
    id: 'sunset',
    name: 'Sunset',
    note: 'Warm orange, a picture beside the form.',
    layout: 'split_feature',
    branding: { primaryColor: '#B93815', fontFamily: font('poppins'), cardStyle: 'elevated', panelTreatment: 'gradient', backgroundStyle: 'gradient', theme: { v: 1, colors: { fieldBorder: border } } },
  },
  {
    id: 'mint',
    name: 'Mint',
    note: 'Fresh green, pill-shaped fields.',
    layout: 'classic',
    branding: {
      primaryColor: '#0F766E',
      fontFamily: font('quicksand'),
      cardStyle: 'bordered',
      panelTreatment: 'solid',
      backgroundStyle: 'image',
      backgroundImageUrl: '/form-pictures/aurora-mint.jpg',
      theme: { v: 1, colors: { text: '#0F2A2A', fieldBorder: border }, fields: { radius: 20 } },
    },
  },
  {
    id: 'paper',
    name: 'Warm paper',
    note: 'Cream card, brown ink, a serif.',
    layout: 'card_stack',
    branding: {
      primaryColor: '#9A4A06',
      fontFamily: font('merriweather'),
      cardStyle: 'soft',
      panelTreatment: 'solid',
      backgroundStyle: 'plain',
      theme: { v: 1, colors: { text: '#3B2F2F', card: '#FFFBF2', fieldBorder: '#8C7B6A' } },
    },
  },
  {
    id: 'tech',
    name: 'Tech',
    note: 'Indigo, tight and flat, filled fields.',
    layout: 'compact',
    branding: { primaryColor: '#4338CA', fontFamily: font('space_grotesk'), cardStyle: 'flat', panelTreatment: 'solid', backgroundStyle: 'dots', theme: { v: 1, colors: { fieldBorder: border }, fields: { style: 'filled', radius: 6 } } },
  },
  {
    id: 'calm',
    name: 'Calm waves',
    note: 'Soft blue waves behind a quiet form.',
    layout: 'classic',
    branding: { primaryColor: '#1D4ED8', fontFamily: font('outfit'), cardStyle: 'soft', panelTreatment: 'solid', backgroundStyle: 'image', backgroundImageUrl: '/form-pictures/calm-waves.jpg', theme: { v: 1, colors: { fieldBorder: border } } },
  },
  {
    id: 'bold',
    name: 'Bold',
    note: 'Black on yellow, big type.',
    layout: 'steps',
    branding: {
      primaryColor: '#111111',
      fontFamily: font('montserrat'),
      typeScale: 'large',
      cardStyle: 'flat',
      panelTreatment: 'solid',
      backgroundStyle: 'solid',
      backgroundColor: '#FACC15',
      theme: { v: 1, colors: { fieldBorder: '#6B7280' }, fields: { style: 'underline' }, fonts: { heading: font('bebas_neue') } },
    },
  },
  {
    id: 'handwritten',
    name: 'Handwritten',
    note: 'A friendly hand for the title, lavender around.',
    layout: 'guided',
    branding: {
      primaryColor: '#6D28D9',
      fontFamily: font('nunito'),
      cardStyle: 'elevated',
      panelTreatment: 'solid',
      backgroundStyle: 'image',
      backgroundImageUrl: '/form-pictures/lavender-haze.jpg',
      theme: { v: 1, colors: { fieldBorder: border }, fields: { radius: 14 }, fonts: { heading: font('caveat') } },
    },
  },
];
