import { describe, expect, it } from 'vitest';
import { clampResponsePage, normalizeResponsePage } from '@/lib/responseList';

describe('response-list utilities', () => {
  it.each([
    [null, 1],
    ['NaN', 1],
    ['0', 1],
    ['-4', 1],
    ['1.5', 1],
    ['9007199254740992', 1],
    ['3', 3],
  ])('normalizes page %s to %i', (rawPage, expected) => {
    expect(normalizeResponsePage(rawPage)).toBe(expected);
  });

  it('clamps pages to the available range', () => {
    expect(clampResponsePage(0, 5)).toBe(1);
    expect(clampResponsePage(8, 5)).toBe(5);
    expect(clampResponsePage(3, 5)).toBe(3);
    expect(clampResponsePage(3, 0)).toBe(1);
  });
});
