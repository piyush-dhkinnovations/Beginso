// A form's LOOK as something that can be kept and applied to another form: its layout and the branding that is about looks (colours, fonts, card,
// fields, background), without anything that belongs to one form (logo, icon, header text and links, an uploaded cover or background).
// "My styles" are saved through /api/form-styles; the ready-made gallery (GALLERY_STYLES) is code, no server needed.
import { cleanTheme } from '@/lib/formTheme';
import { isBuiltInPictureUrl } from '@/lib/formPictures';
import type { FormBranding, FormTheme, LayoutPreset } from '@/types/form';

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
  // a style is a look, not one form's own content: a photographer's credit belongs to a photo (and a style keeps no outside photo), and the button
  // text and the note under the form are that form's own words
  // (of the thank-you screen a style keeps the look, the accent colour and the confetti, but not the headline, the picture or where people are sent on)
  const { credit: _credit, labels: _labels, footer: _footer, crop: _crop, success, ...theme } = cleanTheme(branding.theme) ?? { v: 1 as const };
  const look = { ...(success?.colour ? { colour: success.colour } : {}), ...(success?.confetti ? { confetti: true as const } : {}) };
  const kept: FormTheme = { ...theme, ...(Object.keys(look).length ? { success: look } : {}) };
  if (Object.keys(kept).length > 1) out.theme = kept;
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
  // The form keeps its own words (button text, the note under the form) and the credit of a photo the style leaves alone: they are not part of a look.
  const own = cleanTheme(current.theme);
  const keep: Record<string, unknown> = {};
  if (own?.labels) keep.labels = own.labels;
  if (own?.footer) keep.footer = own.footer;
  if (own?.crop) keep.crop = own.crop; // each remembered crop is only used while its picture is still the one in use
  // the thank-you screen: the form keeps its own headline, picture and redirect; the accent colour and the confetti come from the style
  const ownSuccess: Record<string, unknown> = {};
  if (own?.success?.headline) ownSuccess.headline = own.success.headline;
  if (own?.success?.picture) ownSuccess.picture = own.success.picture;
  if (own?.success?.redirect) ownSuccess.redirect = own.success.redirect;
  const credit: Record<string, unknown> = {};
  for (const [slot, key] of [['cover', 'coverImageUrl'], ['background', 'backgroundImageUrl']] as const) {
    if (own?.credit?.[slot] && updates[key] === current[key]) credit[slot] = own.credit[slot];
  }
  if (Object.keys(credit).length) keep.credit = credit;
  const styled = style.branding.theme?.success;
  const success = { ...ownSuccess, ...(styled?.colour ? { colour: styled.colour } : {}), ...(styled?.confetti ? { confetti: true } : {}) };
  if (Object.keys(success).length) keep.success = success;
  const merged = { ...(style.branding.theme ?? { v: 1 }), ...keep };
  // null is how a save clears a theme on the server
  updates.theme = Object.keys(merged).length > 1 ? merged : null;
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

// The ready-made gallery
// The Looks live in ONE file the backend owns (Beginso-Backend/src/data/formLooks.json), served by GET /api/form-looks. `src/data/formLooks.json` is a
// copy of it (npm run sync:looks) that the app uses when the API cannot be reached; useFormLooks prefers the live list. Each one is a whole look (layout,
// colours, typeface, card, fields, background); their colours are checked for readability in the backend's tests and again here
// (__tests__/lib/formStyles.test.ts): text 4.5 to 1, a field border 3 to 1.
import bundled from '@/data/formLooks.json';

export interface GalleryStyle extends FormStyle {
  note: string;
  /** What it suits, in a few words. */
  goodFor?: string;
  /** Hidden from the Looks gallery; a form or template that already uses it is not touched. */
  retired?: boolean;
}

/** Reads a list of Looks (from the file or the API) and keeps only well-formed ones: an id, a name, a layout and a branding object. */
export function readLooks(raw: unknown): GalleryStyle[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((r): GalleryStyle[] => {
    const l = r as Partial<GalleryStyle> | null;
    if (!l || typeof l.id !== 'string' || typeof l.name !== 'string' || typeof l.layout !== 'string' || !l.branding || typeof l.branding !== 'object') return [];
    return [{ id: l.id, name: l.name, note: typeof l.note === 'string' ? l.note : '', goodFor: typeof l.goodFor === 'string' ? l.goodFor : undefined, ...(l.retired === true ? { retired: true } : {}), layout: l.layout as LayoutPreset, branding: l.branding as StyleBranding }];
  });
}

/** The version of the Looks file this copy was made from (the backend raises it whenever the Looks change). */
export const BUNDLED_LOOKS_VERSION: number = bundled.version;

/** Every Look in the bundled copy, retired ones included: a form that uses one still needs it. */
export const GALLERY_STYLES: readonly GalleryStyle[] = readLooks(bundled.looks);

/** What the Looks gallery offers: the Looks that are not retired. */
export const visibleLooks = (looks: readonly GalleryStyle[]): GalleryStyle[] => looks.filter((l) => !l.retired);
