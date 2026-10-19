/**
 * Small pure helpers for the V2 field types — shared by the public form, the field editor preview and
 * the response viewer, so a value is formatted and validated in exactly one way.
 */

import type {
  CurrencyCode,
  FormField,
  ImageAspectRatio,
  ImagePreviewPosition,
  ImagePreviewSize,
  UrlDisplay,
  UrlPreviewStyle,
} from '@/types/form';

// ─── Image upload settings ───────────────────────────────────────────────────

export const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const IMAGE_ACCEPT = IMAGE_MIME_TYPES.join(',');
export const IMAGE_MAX_COUNT_OPTIONS = [2, 5, 10] as const;
export const DEFAULT_IMAGE_MAX_MB = 10;

export interface ImageSettings {
  allowMultiple: boolean;
  maxImages: number;
  maxSizeMb: number;
  previewPosition: ImagePreviewPosition;
  aspectRatio: ImageAspectRatio;
  previewSize: ImagePreviewSize;
}

export function imageSettings(field?: FormField): ImageSettings {
  const f = field?.type === 'image_upload' ? field : undefined;
  const allowMultiple = f?.allowMultiple ?? false;
  return {
    allowMultiple,
    maxImages: allowMultiple ? f?.maxImages ?? 5 : 1,
    maxSizeMb: f?.maxFileSize ?? DEFAULT_IMAGE_MAX_MB,
    previewPosition: f?.previewPosition ?? 'top',
    aspectRatio: f?.aspectRatio ?? 'original',
    previewSize: f?.previewSize ?? 'large',
  };
}

/** Client-side check for one picked image; the server repeats it (type, size and the file's real bytes). */
export function validateImage(file: File, maxSizeMb: number): string | null {
  if (!IMAGE_MIME_TYPES.includes(file.type) || !/\.(jpe?g|png|webp)$/i.test(file.name)) {
    return 'Only JPG, PNG or WebP images are allowed.';
  }
  if (file.size > maxSizeMb * 1024 * 1024) return `Each image must be ${maxSizeMb} MB or smaller.`;
  return null;
}

// ─── URL ─────────────────────────────────────────────────────────────────────

export interface UrlSettings {
  style: UrlPreviewStyle;
  display: UrlDisplay;
  previewPosition: ImagePreviewPosition;
  aspectRatio: ImageAspectRatio;
  previewSize: ImagePreviewSize;
}

export function urlSettings(field?: FormField): UrlSettings {
  const f = field?.type === 'url' ? field : undefined;
  return {
    style: f?.urlPreviewStyle ?? 'rich',
    display: f?.urlDisplay ?? 'card',
    previewPosition: f?.urlPreviewPosition ?? 'inline',
    aspectRatio: f?.urlAspectRatio ?? 'original',
    previewSize: f?.urlPreviewSize ?? 'medium',
  };
}

/** The parsed URL when `value` is a plain http(s) address, otherwise null. Anything else is shown as text, never as a link. */
export function safeHttpUrl(value: unknown): URL | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
  } catch {
    return null;
  }
}

export function domainOf(url: URL): string {
  return url.hostname.replace(/^www\./, '');
}

// ─── Currency ────────────────────────────────────────────────────────────────

export const CURRENCY_OPTIONS: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: 'INR', label: 'Indian rupee (₹)', symbol: '₹' },
  { code: 'USD', label: 'US dollar ($)', symbol: '$' },
  { code: 'EUR', label: 'Euro (€)', symbol: '€' },
  { code: 'GBP', label: 'British pound (£)', symbol: '£' },
];

export const currencyOf = (field?: FormField): CurrencyCode => (field?.type === 'currency' ? field.currency : undefined) ?? 'INR';

export const currencySymbol = (code: CurrencyCode): string => CURRENCY_OPTIONS.find((c) => c.code === code)?.symbol ?? code;

/** "₹50,000" — Indian digit grouping for INR, standard grouping otherwise. */
export function formatCurrency(value: number, code: CurrencyCode): string {
  return new Intl.NumberFormat(code === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency: code, maximumFractionDigits: 2 }).format(value);
}

// ─── Time & date-time ────────────────────────────────────────────────────────

/** "14:30" → "2:30 PM"; anything that is not HH:MM is returned unchanged. */
export function formatTime12(value: string): string {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return value;
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? 'AM' : 'PM'}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-09-25" → "25 Sep 2026"; anything else is returned unchanged. */
export function formatDate(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? m[2]} ${m[1]}` : value;
}

/** "2026-09-25T10:30" → "25 Sep 2026, 10:30 AM"; anything else is returned unchanged. */
export function formatDateTime(value: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})$/.exec(value);
  if (!m) return value;
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1] ?? m[2]} ${m[1]}, ${formatTime12(m[4])}`;
}

// ─── Address ─────────────────────────────────────────────────────────────────

export const ADDRESS_PARTS = ['Street', 'City', 'State', 'ZIP / PIN'] as const;

/** Address answers are stored as four newline-separated lines (street, city, state, ZIP); empty lines are dropped for display. */
export const addressLines = (value: string): string[] => value.split('\n').map((l) => l.trim()).filter(Boolean);

// ─── Signature ───────────────────────────────────────────────────────────────

const SIGNATURE_PNG_RE = /^data:image\/png;base64,[A-Za-z0-9+/=]+$/;

/** A drawn signature is a PNG data URL; a typed one is plain text. Only the PNG form is ever used as an <img> source. */
export const isDrawnSignature = (value: unknown): value is string => typeof value === 'string' && value.length <= 300_000 && SIGNATURE_PNG_RE.test(value);
