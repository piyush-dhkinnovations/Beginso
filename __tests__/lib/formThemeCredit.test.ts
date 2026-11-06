import { describe, expect, it } from 'vitest';
import { cleanCredit, cleanTheme, creditsToShow, withCredit } from '@/lib/formTheme';
import { snapshotStyle } from '@/lib/formStyles';

const A = { name: 'Ada Lovelace', url: 'https://unsplash.com/@ada?utm_source=beginso&utm_medium=referral' };
const B = { name: 'Bo Peep', url: 'https://unsplash.com/@bo?utm_source=beginso&utm_medium=referral' };
const PIC = 'https://images.unsplash.com/photo-1?w=1920';

describe('cleanCredit', () => {
  it('keeps a name with an unsplash.com address and refuses everything else', () => {
    expect(cleanCredit(A)).toEqual(A);
    expect(cleanCredit({ ...A, name: '  Ada  ' })).toEqual({ ...A, name: 'Ada' });
    const bad = [
      null,
      'x',
      {},
      { ...A, name: '' },
      { ...A, name: 'a'.repeat(81) },
      { ...A, name: '<b>x</b>' },
      { ...A, name: 'a\u0007b' },
      { ...A, url: 'http://unsplash.com/@ada' },
      { ...A, url: 'https://evil.example/@ada' },
      { ...A, url: 'https://unsplash.com.evil.example/@a' },
      { ...A, url: 'javascript:alert(1)' },
    ];
    for (const b of bad) expect(cleanCredit(b)).toBeUndefined();
  });
});

describe('cleanTheme credit', () => {
  it('keeps a valid credit per picture and drops a bad one', () => {
    expect(cleanTheme({ v: 1, credit: { cover: A, background: { name: 'x', url: 'https://evil.example' } } })?.credit).toEqual({ cover: A });
    expect(cleanTheme({ v: 1, credit: { background: { name: 'x', url: 'https://evil.example' } } })?.credit).toBeUndefined();
  });
});

describe('withCredit', () => {
  it("sets and clears one picture's credit, and an emptied theme is null", () => {
    const one = withCredit(null, 'cover', A);
    expect(one).toEqual({ v: 1, credit: { cover: A } });
    const two = withCredit(one, 'background', B);
    expect(two?.credit).toEqual({ cover: A, background: B });
    expect(withCredit(two, 'cover')?.credit).toEqual({ background: B });
    expect(withCredit(one, 'cover')).toBeNull();
    expect(withCredit({ v: 1, colors: { text: '#000000' }, credit: { cover: A } }, 'cover')).toEqual({ v: 1, colors: { text: '#000000' } });
  });
});

describe('creditsToShow', () => {
  const theme = { v: 1 as const, credit: { cover: A, background: B } };
  it('shows a credit only while its Unsplash picture is in use', () => {
    expect(creditsToShow({ theme, coverImageUrl: PIC, backgroundImageUrl: PIC, backgroundStyle: 'image' })).toEqual([A, B]);
    expect(creditsToShow({ theme, coverImageUrl: '/api/upload/file/x.png', backgroundImageUrl: PIC, backgroundStyle: 'image' })).toEqual([B]);
    expect(creditsToShow({ theme, coverImageUrl: PIC, backgroundImageUrl: PIC, backgroundStyle: 'gradient' })).toEqual([A]);
    expect(creditsToShow({ theme: null, coverImageUrl: PIC })).toEqual([]);
  });
  it('shows one photographer once when both pictures are theirs', () => {
    expect(creditsToShow({ theme: { v: 1, credit: { cover: A, background: A } }, coverImageUrl: PIC, backgroundImageUrl: PIC, backgroundStyle: 'image' })).toEqual([A]);
  });
});

describe('a saved style', () => {
  it('keeps no photographer credit', () => {
    const { branding } = snapshotStyle('classic', { theme: { v: 1, colors: { text: '#101010' }, credit: { cover: A } }, coverImageUrl: PIC });
    expect(branding.theme).toEqual({ v: 1, colors: { text: '#101010' } });
    expect(branding.coverImageUrl).toBeUndefined();
    expect(snapshotStyle('classic', { theme: { v: 1, credit: { cover: A } } }).branding.theme).toBeUndefined();
  });
});
