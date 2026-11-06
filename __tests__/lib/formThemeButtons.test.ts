/**
 * Buttons and details in branding.theme: size, width and hover, the owner's own button text, the progress style and the note under the form.
 * Only what the server accepts is kept, a layout that cannot show an option leaves it out, and a form that sets none draws as before.
 */
import { describe, it, expect } from 'vitest';
import { brandFooterNote, brandLabels, brandLookProps, brandProgressStyle, cleanText, cleanTheme, effectiveTheme, patchTheme, themeOptionBlocked } from '@/lib/formTheme';
import type { FormTheme } from '@/types/form';

const WHOLE: FormTheme = {
  v: 1,
  buttons: { size: 'large', width: 'auto', hover: 'lift' },
  labels: { submit: 'Send it', next: 'Continue', back: 'Go back' },
  progress: { style: 'dots' },
  footer: { note: 'Questions? Write to hello@example.com' },
};

describe('cleanText', () => {
  it('trims, and accepts 1 to the limit', () => {
    expect(cleanText('  Send  ', 30)).toBe('Send');
    expect(cleanText('x'.repeat(30), 30)).toHaveLength(30);
  });
  it.each([['', 30], ['   ', 30], ['x'.repeat(31), 30], ['<b>Hi</b>', 30], ['a\u0007b', 30], [5, 30], [null, 30], [undefined, 30]])('refuses %j', (value, max) => {
    expect(cleanText(value, max as number)).toBeUndefined();
  });
});

describe('cleanTheme: the new groups', () => {
  it('keeps all of it when it is valid', () => {
    expect(cleanTheme(WHOLE)).toEqual(WHOLE);
  });

  it('drops an unknown option, a bad text and an unknown key, and leaves the rest', () => {
    const t = cleanTheme({ v: 1, buttons: { size: 'huge', width: 'auto', hover: 'spin', glow: 1 }, labels: { submit: '<b>', next: 'Go', shout: 'HEY' }, progress: { style: 'wheel' }, footer: { note: 'x'.repeat(201) } });
    expect(t).toEqual({ v: 1, buttons: { width: 'auto' }, labels: { next: 'Go' } });
  });

  it('is nothing at all when nothing in it is valid', () => {
    expect(cleanTheme({ v: 1, buttons: { size: 'huge' }, labels: { submit: '' }, footer: { note: ' ' } })).toBeUndefined();
  });
});

describe('brandLookProps: data attributes for the buttons', () => {
  it('sets one per choice that is not the default, and none for a form without them', () => {
    const p = brandLookProps({ theme: WHOLE });
    expect(p['data-btn-size']).toBe('large');
    expect(p['data-btn-width']).toBe('auto');
    expect(p['data-btn-hover']).toBe('lift');
    const none = brandLookProps({ theme: { v: 1, buttons: { size: 'default', width: 'fill', hover: 'none' } } });
    expect(none['data-btn-size']).toBeUndefined();
    expect(none['data-btn-width']).toBeUndefined();
    expect(none['data-btn-hover']).toBeUndefined();
    const plain = brandLookProps({});
    expect(Object.keys(plain).filter((k) => k.startsWith('data-btn'))).toEqual(['data-btn-size', 'data-btn-width', 'data-btn-hover']);
    expect(Object.values(plain).filter((v) => v !== undefined && typeof v !== 'object' && v !== 'form-look')).toEqual([]);
  });
});

describe('the words, the progress style and the note', () => {
  it('uses the owner\'s words, and the usual ones where they left a box empty', () => {
    expect(brandLabels({ theme: WHOLE })).toEqual({ submit: 'Send it', next: 'Continue', back: 'Go back' });
    expect(brandLabels({ theme: { v: 1, labels: { next: 'Go' } } })).toEqual({ submit: 'Submit', next: 'Go', back: 'Back' });
    expect(brandLabels({})).toEqual({ submit: 'Submit', next: 'Next', back: 'Back' });
  });
  it('defaults the progress to a bar and gives no note unless one was written', () => {
    expect(brandProgressStyle({})).toBe('bar');
    expect(brandProgressStyle({ theme: WHOLE })).toBe('dots');
    expect(brandFooterNote({})).toBeUndefined();
    expect(brandFooterNote({ theme: WHOLE })).toBe('Questions? Write to hello@example.com');
  });
});

describe('layouts with their own progress', () => {
  it.each(['steps', 'guided', 'chat', 'focus'] as const)('%s says why a progress style has nothing to change, and leaves it out', (layout) => {
    expect(themeOptionBlocked('progressStyle', layout)).toMatch(/own/);
    const t = effectiveTheme(layout, WHOLE);
    expect(t?.progress).toBeUndefined();
    expect(t?.buttons).toEqual(WHOLE.buttons);
    expect(t?.labels).toEqual(WHOLE.labels);
  });
  it.each(['classic', 'card_stack', 'split_feature', 'compact', 'sidebar', 'open'] as const)('%s keeps it', (layout) => {
    expect(themeOptionBlocked('progressStyle', layout)).toBeUndefined();
    expect(effectiveTheme(layout, WHOLE)?.progress).toEqual({ style: 'dots' });
  });
});

describe('patchTheme with the new groups', () => {
  it('sets a word, and clears it, and the emptied theme goes back to null', () => {
    const one = patchTheme(null, 'labels', { submit: 'Send' });
    expect(one).toEqual({ v: 1, labels: { submit: 'Send' } });
    expect(patchTheme(one, 'labels', { submit: undefined })).toBeNull();
    expect(patchTheme({ v: 1, footer: { note: 'Hi' }, card: { radius: 8 } }, 'footer', { note: undefined })).toEqual({ v: 1, card: { radius: 8 } });
  });
});
