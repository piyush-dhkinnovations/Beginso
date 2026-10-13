import { describe, it, expect } from 'vitest';
import {
  imageSettings,
  validateImage,
  urlSettings,
  safeHttpUrl,
  domainOf,
  currencyOf,
  currencySymbol,
  formatCurrency,
  formatTime12,
  formatDate,
  formatDateTime,
  addressLines,
  isDrawnSignature,
  DEFAULT_IMAGE_MAX_MB,
} from '@/lib/fieldDisplay';
import type { FormField } from '@/types/form';

const field = (o: Record<string, unknown>) => o as unknown as FormField;

describe('imageSettings', () => {
  it('has defaults without a field or for another type', () => {
    expect(imageSettings()).toEqual({
      allowMultiple: false, maxImages: 1, maxSizeMb: DEFAULT_IMAGE_MAX_MB, previewPosition: 'top', aspectRatio: 'original', previewSize: 'large',
    });
    expect(imageSettings(field({ type: 'short_text', allowMultiple: true })).allowMultiple).toBe(false);
  });

  it('single mode forces one image; multiple defaults to 5', () => {
    expect(imageSettings(field({ type: 'image_upload', allowMultiple: false, maxImages: 10 })).maxImages).toBe(1);
    expect(imageSettings(field({ type: 'image_upload', allowMultiple: true })).maxImages).toBe(5);
    expect(imageSettings(field({ type: 'image_upload', allowMultiple: true, maxImages: 2, maxFileSize: 3 }))).toMatchObject({ maxImages: 2, maxSizeMb: 3 });
  });
});

describe('validateImage', () => {
  const file = (name: string, type: string, size = 100) => {
    const f = new File(['x'], name, { type });
    Object.defineProperty(f, 'size', { value: size });
    return f;
  };

  it('accepts jpg/png/webp', () => {
    expect(validateImage(file('a.jpg', 'image/jpeg'), 5)).toBeNull();
    expect(validateImage(file('a.JPEG', 'image/jpeg'), 5)).toBeNull();
    expect(validateImage(file('a.png', 'image/png'), 5)).toBeNull();
    expect(validateImage(file('a.webp', 'image/webp'), 5)).toBeNull();
  });

  it('rejects wrong mime or extension', () => {
    expect(validateImage(file('a.gif', 'image/gif'), 5)).toMatch(/only jpg, png or webp/i);
    expect(validateImage(file('a.exe', 'image/png'), 5)).toMatch(/only jpg/i);
  });

  it('rejects files over the limit', () => {
    expect(validateImage(file('a.png', 'image/png', 3 * 1024 * 1024), 2)).toBe('Each image must be 2 MB or smaller.');
    expect(validateImage(file('a.png', 'image/png', 2 * 1024 * 1024), 2)).toBeNull();
  });
});

describe('url helpers', () => {
  it('urlSettings defaults', () => {
    expect(urlSettings()).toEqual({ style: 'rich', display: 'card' });
    expect(urlSettings(field({ type: 'url', urlPreviewStyle: 'simple', urlDisplay: 'inline' }))).toEqual({ style: 'simple', display: 'inline' });
  });

  it('safeHttpUrl only allows http(s)', () => {
    expect(safeHttpUrl(' https://www.example.com/a ')?.hostname).toBe('www.example.com');
    expect(safeHttpUrl('http://x.io')).not.toBeNull();
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpUrl('ftp://x.io')).toBeNull();
    expect(safeHttpUrl('nope')).toBeNull();
    expect(safeHttpUrl(42)).toBeNull();
    expect(safeHttpUrl(`https://x.io/${'a'.repeat(2100)}`)).toBeNull();
  });

  it('domainOf strips www', () => {
    expect(domainOf(new URL('https://www.example.com/x'))).toBe('example.com');
    expect(domainOf(new URL('https://app.example.com'))).toBe('app.example.com');
  });
});

describe('currency', () => {
  it('currencyOf defaults to INR', () => {
    expect(currencyOf()).toBe('INR');
    expect(currencyOf(field({ type: 'currency', currency: 'EUR' }))).toBe('EUR');
    expect(currencyOf(field({ type: 'short_text', currency: 'EUR' }))).toBe('INR');
  });

  it('currencySymbol', () => {
    expect(currencySymbol('GBP')).toBe('£');
    expect(currencySymbol('USD')).toBe('$');
  });

  it('formatCurrency uses Indian grouping for INR', () => {
    expect(formatCurrency(5000000, 'INR')).toContain('50,00,000');
    expect(formatCurrency(5000000, 'USD')).toContain('5,000,000');
    expect(formatCurrency(1.5, 'USD')).toBe('$1.50');
  });
});

describe('date and time formats', () => {
  it('formatTime12', () => {
    expect(formatTime12('14:30')).toBe('2:30 PM');
    expect(formatTime12('00:05')).toBe('12:05 AM');
    expect(formatTime12('12:00')).toBe('12:00 PM');
    expect(formatTime12('9:30')).toBe('9:30');
  });

  it('formatDate', () => {
    expect(formatDate('2026-09-25')).toBe('25 Sep 2026');
    expect(formatDate('2026-01-05')).toBe('5 Jan 2026');
    expect(formatDate('2026-13-05')).toBe('5 13 2026');
    expect(formatDate('25/09/2026')).toBe('25/09/2026');
  });

  it('formatDateTime', () => {
    expect(formatDateTime('2026-09-25T10:30')).toBe('25 Sep 2026, 10:30 AM');
    expect(formatDateTime('2026-09-25T22:05')).toBe('25 Sep 2026, 10:05 PM');
    expect(formatDateTime('2026-09-25')).toBe('2026-09-25');
  });
});

describe('address and signature', () => {
  it('addressLines drops blanks and trims', () => {
    expect(addressLines('12 Main St\n\n Pune \nMH\n 411001 ')).toEqual(['12 Main St', 'Pune', 'MH', '411001']);
    expect(addressLines('')).toEqual([]);
  });

  it('isDrawnSignature accepts only PNG data URLs', () => {
    expect(isDrawnSignature('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
    expect(isDrawnSignature('data:image/svg+xml;base64,AAAA')).toBe(false);
    expect(isDrawnSignature('data:image/png;base64,<script>')).toBe(false);
    expect(isDrawnSignature('Jane Doe')).toBe(false);
    expect(isDrawnSignature(null)).toBe(false);
    expect(isDrawnSignature(`data:image/png;base64,${'A'.repeat(300_001)}`)).toBe(false);
  });
});
