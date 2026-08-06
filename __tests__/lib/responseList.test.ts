import { describe, expect, it, vi } from 'vitest';
import { clampResponsePage, normalizeResponsePage, normalizeResponseStatus, runSequentially } from '@/lib/responseList';

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

  it.each([
    ['new', 'new'],
    ['in_progress', 'in_progress'],
    ['completed', 'completed'],
    ['all', undefined],
    ['admin', undefined],
    [null, undefined],
  ])('normalizes status %s without trusting a TypeScript cast', (rawStatus, expected) => {
    expect(normalizeResponseStatus(rawStatus)).toBe(expected);
  });

  it('waits for each bulk operation before starting the next one', async () => {
    let releaseFirst: (() => void) | undefined;
    const firstPending = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const operation = vi.fn((id: string) => (id === 'first' ? firstPending : Promise.resolve()));

    const pending = runSequentially(['first', 'second', 'third'], operation);
    await Promise.resolve();
    expect(operation).toHaveBeenCalledTimes(1);

    releaseFirst?.();
    await pending;
    expect(operation.mock.calls.map(([id]) => id)).toEqual(['first', 'second', 'third']);
  });
});
