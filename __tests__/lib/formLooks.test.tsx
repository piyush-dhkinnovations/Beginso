/**
 * Feature: ready-made Looks (one data file owned by the backend, a bundled copy as the offline fallback)
 * Tests: the copy matches the backend file, every Look is readable, the live list wins when it arrives, the copy stays when it cannot.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderHook, waitFor } from '@testing-library/react';

const get = vi.hoisted(() => vi.fn());
vi.mock('@/lib/axios', () => ({ default: { get } }));

import bundled from '@/data/formLooks.json';
import { BUNDLED_LOOKS_VERSION, GALLERY_STYLES, readLooks, visibleLooks } from '@/lib/formStyles';
import { readabilityChecks } from '@/components/form-builder/LookControls';
import { resetFormLooksCache, useFormLooks, warnIfLooksBehind } from '@/hooks/useFormLooks';
import { formLooksService } from '@/services/formLooks';
import type { FormBranding } from '@/types/form';

const OLD = ['clean', 'corporate', 'editorial', 'playful', 'midnight', 'sunset', 'mint', 'paper', 'tech', 'calm', 'bold', 'handwritten'];
const NEW = ['clean-corporate', 'warm-friendly', 'elegant-serif', 'bold-event', 'playful-bright', 'calm-care', 'minimal-paper', 'dark-tech', 'editorial-split', 'appetite'];

describe('the bundled Looks', () => {
  it('are the twelve that already existed plus the ten new families, each once', () => {
    const ids = GALLERY_STYLES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(expect.arrayContaining([...OLD, ...NEW]));
    expect(ids).toHaveLength(OLD.length + NEW.length);
  });

  // The backend's file is the one source. In this repo's CI it is not there (separate repository); on a machine with both checked out, a copy
  // that differs fails here, and `npm run sync:looks` fixes it. At run time the app uses the live list anyway (see below).
  const sibling = resolve(process.cwd(), '../Beginso-Backend/src/data/formLooks.json');
  it.skipIf(!existsSync(sibling))('match the backend file byte for byte (run npm run sync:looks when they do not)', () => {
    // line endings are the checkout's business, not the data's
    const text = (file: string) => readFileSync(file, 'utf8').replaceAll('\r\n', '\n');
    expect(text(resolve(process.cwd(), 'src/data/formLooks.json'))).toBe(text(sibling));
  });

  it.each(GALLERY_STYLES.map((g) => [g.name, g] as const))('%s is readable: text 4.5 to 1, field border and brand colour 3 to 1', (_n, g) => {
    const failing = readabilityChecks(g.branding as FormBranding)
      .filter((c) => c.ratio !== null && c.ratio < c.need)
      .map((c) => `${c.id} ${(c.ratio as number).toFixed(2)} < ${c.need}`);
    expect(failing).toEqual([]);
  });

  it('carry a one-line note and what they suit', () => {
    for (const g of GALLERY_STYLES) {
      expect(g.note.length).toBeGreaterThan(0);
      expect(g.goodFor?.length ?? 0).toBeGreaterThan(0);
    }
  });
});

describe('readLooks', () => {
  it('keeps well-formed Looks and drops the rest', () => {
    const ok = { id: 'a', name: 'A', note: 'n', layout: 'classic', branding: { primaryColor: '#111111' } };
    expect(readLooks([ok, null, 'x', { id: 'b' }, { ...ok, id: 'c', branding: null }]).map((l) => l.id)).toEqual(['a']);
    expect(readLooks({ data: [ok] })).toEqual([]);
    expect(readLooks(bundled.looks)).toHaveLength(bundled.looks.length);
  });
});

describe('formLooksService', () => {
  beforeEach(() => get.mockReset());

  it('reads { data, version } and a bare list', async () => {
    get.mockResolvedValueOnce({ data: { success: true, version: 2, data: bundled.looks } });
    expect(await formLooksService.list()).toMatchObject({ version: 2 });
    get.mockResolvedValueOnce({ data: bundled.looks });
    expect((await formLooksService.list()).looks).toHaveLength(bundled.looks.length);
  });

  it('refuses a reply with no readable Look', async () => {
    get.mockResolvedValueOnce({ data: { data: [] } });
    await expect(formLooksService.list()).rejects.toThrow(/Unexpected/);
  });
});

describe('useFormLooks', () => {
  beforeEach(() => {
    get.mockReset();
    resetFormLooksCache();
  });

  it('shows the bundled Looks at once, then the live list when it arrives', async () => {
    const live = { id: 'new-one', name: 'New one', note: 'n', goodFor: 'g', layout: 'classic', branding: { primaryColor: '#111111' } };
    get.mockResolvedValue({ data: { data: [live] } });
    const { result } = renderHook(() => useFormLooks());
    expect(result.current).toBe(GALLERY_STYLES);
    await waitFor(() => expect(result.current.map((l) => l.id)).toEqual(['new-one']));
  });

  it('keeps the bundled Looks when the API cannot be reached', async () => {
    get.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useFormLooks());
    await waitFor(() => expect(get).toHaveBeenCalled());
    expect(result.current).toBe(GALLERY_STYLES);
  });
});

describe('retired Looks', () => {
  it('stay in the bundled copy (a form may use one) but are hidden from the gallery', () => {
    const retired = GALLERY_STYLES.filter((g) => g.retired).map((g) => g.id).sort();
    expect(retired).toEqual(['handwritten', 'playful', 'sunset', 'tech']);
    expect(GALLERY_STYLES.some((g) => g.id === 'tech')).toBe(true);
    const shown = visibleLooks(GALLERY_STYLES).map((g) => g.id);
    for (const id of retired) expect(shown).not.toContain(id);
    expect(shown).toHaveLength(GALLERY_STYLES.length - 4);
  });
});

describe('the Looks version', () => {
  beforeEach(() => resetFormLooksCache());

  it('is a whole number in the bundled file', () => {
    expect(Number.isInteger(BUNDLED_LOOKS_VERSION)).toBe(true);
  });

  it('warns once in development when the live version differs, and never when it matches or is unknown', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    warnIfLooksBehind(BUNDLED_LOOKS_VERSION);
    warnIfLooksBehind(null);
    expect(warn).not.toHaveBeenCalled();
    warnIfLooksBehind(BUNDLED_LOOKS_VERSION + 1);
    warnIfLooksBehind(BUNDLED_LOOKS_VERSION + 1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('npm run sync:looks');
    warn.mockRestore();
  });

  it('stays silent in production', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubEnv('NODE_ENV', 'production');
    warnIfLooksBehind(BUNDLED_LOOKS_VERSION + 5);
    vi.unstubAllEnvs();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
