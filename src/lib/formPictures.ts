// The app's own picture library for a form's page background and cover: original gradients, glows, waves and patterns made for Beginso
// (nothing to credit). The files live in public/form-pictures/<id>.jpg (1920 x 1080) with a small preview in public/form-pictures/thumbs/<id>.jpg.
// A form stores the plain path, "/form-pictures/<id>.jpg"; the backend accepts exactly that shape (see safeImageUrl in the backend).

export type PictureGroup = 'soft' | 'vivid' | 'waves' | 'patterns' | 'dark';

export interface FormPicture {
  id: string;
  name: string;
  group: PictureGroup;
}

export const PICTURE_GROUPS: { id: PictureGroup; label: string }[] = [
  { id: 'soft', label: 'Soft' },
  { id: 'vivid', label: 'Vivid' },
  { id: 'waves', label: 'Waves' },
  { id: 'patterns', label: 'Patterns' },
  { id: 'dark', label: 'Dark' },
];

export const FORM_PICTURES: readonly FormPicture[] = [
  { id: 'aurora-mint', name: 'Aurora mint', group: 'soft' },
  { id: 'sunrise-peach', name: 'Sunrise peach', group: 'soft' },
  { id: 'lavender-haze', name: 'Lavender haze', group: 'soft' },
  { id: 'ocean-mist', name: 'Ocean mist', group: 'soft' },
  { id: 'rose-quartz', name: 'Rose quartz', group: 'soft' },
  { id: 'citrus-light', name: 'Citrus light', group: 'soft' },
  { id: 'electric-blue', name: 'Electric blue', group: 'vivid' },
  { id: 'violet-pink', name: 'Violet pink', group: 'vivid' },
  { id: 'teal-lime', name: 'Teal lime', group: 'vivid' },
  { id: 'sunset-orange', name: 'Sunset orange', group: 'vivid' },
  { id: 'magenta-sky', name: 'Magenta sky', group: 'vivid' },
  { id: 'forest-glow', name: 'Forest glow', group: 'vivid' },
  { id: 'calm-waves', name: 'Calm waves', group: 'waves' },
  { id: 'sand-dunes', name: 'Sand dunes', group: 'waves' },
  { id: 'forest-waves', name: 'Forest waves', group: 'waves' },
  { id: 'dusk-waves', name: 'Dusk waves', group: 'waves' },
  { id: 'mono-waves', name: 'Mono waves', group: 'waves' },
  { id: 'coral-waves', name: 'Coral waves', group: 'waves' },
  { id: 'dots-ink', name: 'Dots', group: 'patterns' },
  { id: 'grid-paper', name: 'Grid paper', group: 'patterns' },
  { id: 'topo-lines', name: 'Contour lines', group: 'patterns' },
  { id: 'confetti', name: 'Confetti', group: 'patterns' },
  { id: 'midnight-glow', name: 'Midnight glow', group: 'dark' },
  { id: 'carbon', name: 'Carbon', group: 'dark' },
  { id: 'deep-sea', name: 'Deep sea', group: 'dark' },
  { id: 'plum-night', name: 'Plum night', group: 'dark' },
];

/** Exactly the shape the backend accepts: the library folder, a lowercase name, .jpg. */
const BUILT_IN = /^\/form-pictures\/([a-z0-9-]{1,40})\.jpg$/;

export const pictureUrl = (id: string): string => `/form-pictures/${id}.jpg`;
export const pictureThumbUrl = (id: string): string => `/form-pictures/thumbs/${id}.jpg`;

/** The library picture a stored address points at, or undefined for an uploaded or outside picture (and for a library name that is gone). */
export function builtInPicture(url: string | null | undefined): FormPicture | undefined {
  const id = typeof url === 'string' ? BUILT_IN.exec(url)?.[1] : undefined;
  return id ? FORM_PICTURES.find((p) => p.id === id) : undefined;
}

export const isBuiltInPictureUrl = (url: string | null | undefined): url is string => typeof url === 'string' && BUILT_IN.test(url);
