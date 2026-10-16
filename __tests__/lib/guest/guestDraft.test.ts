import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DRAFT_MAX_BYTES, DRAFT_STORAGE_KEY, DRAFT_TTL_MS, clearDraft, loadDraft, putImage, saveClaim, saveDraft, versionOfRaw, type DraftInput } from '@/lib/guest/guestDraft';
import { getBlobStore, memoryBlobStore, setBlobStore } from '@/lib/guest/blobStore';

const input = (over: Partial<DraftInput> = {}): DraftInput => ({
  title: 'Contact',
  fields: [],
  pages: [{ id: 'p', order: 0 }],
  settings: { honeypotEnabled: true },
  branding: {},
  designed: false,
  ...over,
});

beforeEach(async () => {
  setBlobStore(memoryBlobStore());
  await clearDraft();
});

describe('guest draft', () => {
  it('saves and loads', async () => {
    expect(await saveDraft(input())).toEqual({ ok: true, persisted: true, version: 1 });
    expect(loadDraft()?.title).toBe('Contact');
  });

  it('expires after 30 days', async () => {
    await saveDraft(input(), 1000);
    expect(loadDraft(1000 + DRAFT_TTL_MS - 1)).not.toBeNull();
    expect(loadDraft(1000 + DRAFT_TTL_MS + 1)).toBeNull();
    expect(localStorage.getItem('beginso.guestDraft.v1')).toBeNull(); // and is removed
  });

  it('refuses a draft over the size cap', async () => {
    const r = await saveDraft(input({ title: 'x'.repeat(DRAFT_MAX_BYTES + 1) }));
    expect(r).toEqual({ ok: false, reason: 'too_large' });
  });

  it('keeps working in memory when storage throws', async () => {
    const spy = vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(await saveDraft(input())).toEqual({ ok: true, persisted: false, version: 1 });
    spy.mockRestore();
  });

  it('drops a corrupt draft instead of throwing', () => {
    localStorage.setItem('beginso.guestDraft.v1', '{nope');
    expect(loadDraft()).toBeNull();
  });

  it('parks images as blobs, strips their URLs from the JSON, and forgets removed ones', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:fake');
    expect(await putImage('logoUrl', new Blob(['x'], { type: 'image/png' }))).toEqual({ url: 'blob:fake' });
    await saveDraft(input({ branding: { logoUrl: 'blob:fake', primaryColor: '#111111' } }));
    expect(loadDraft()).toMatchObject({ imageKeys: ['logoUrl'], branding: { primaryColor: '#111111' } });
    expect(loadDraft()!.branding.logoUrl).toBeUndefined();
    await saveDraft(input({ branding: {} })); // logo removed
    expect(loadDraft()!.imageKeys).toEqual([]);
    expect(await (await getBlobStore()).totalBytes()).toBe(0);
  });

  it('rejects non-images and images over 5 MB with a message', async () => {
    expect(await putImage('logoUrl', new Blob(['x'], { type: 'text/plain' }))).toHaveProperty('error');
    const big = new Blob([new Uint8Array(5 * 1024 * 1024 + 1)], { type: 'image/png' });
    expect(await putImage('logoUrl', big)).toHaveProperty('error');
  });

  it('records claim progress without touching content', async () => {
    await saveDraft(input());
    saveClaim({ step: 'form_created', formId: 'f1' });
    expect(loadDraft()).toMatchObject({ title: 'Contact', claim: { step: 'form_created', formId: 'f1' } });
  });

  describe('versions: another tab saving first (QA A10-004)', () => {
    it('counts content saves, and an older draft without a version reads as 0', async () => {
      expect(loadDraft()).toBeNull();
      await saveDraft(input());
      expect(loadDraft()?.version).toBe(1);
      await saveDraft(input({ title: 'Two' }));
      expect(loadDraft()?.version).toBe(2);

      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify({ ...loadDraft(), version: undefined }));
      expect(loadDraft()?.title).toBe('Two'); // still opens (the claim flow reads it the same way)
      expect(versionOfRaw(localStorage.getItem(DRAFT_STORAGE_KEY))).toBe(0);
    });

    it('a save based on the version it last saw succeeds, so one tab never conflicts with its own saves', async () => {
      const a = await saveDraft(input({ title: 'A1' }), Date.now(), 0);
      expect(a).toMatchObject({ ok: true, version: 1 });
      const b = await saveDraft(input({ title: 'A2' }), Date.now(), 1);
      expect(b).toMatchObject({ ok: true, version: 2 });
    });

    it('refuses a save from a tab that missed a save from another tab, and writes nothing', async () => {
      await saveDraft(input({ title: 'Tab A edit' }), Date.now(), 0); // tab A: version 0 -> 1
      const stale = await saveDraft(input({ title: 'Tab B overwrite' }), Date.now(), 0); // tab B still thinks 0
      expect(stale).toEqual({ ok: false, reason: 'stale' });
      expect(loadDraft()?.title).toBe('Tab A edit');
      expect(loadDraft()?.version).toBe(1);
    });

    it('saves without an expected version (the template picker) are unconditional', async () => {
      await saveDraft(input({ title: 'X' }));
      expect(await saveDraft(input({ title: 'Y' }))).toMatchObject({ ok: true, version: 2 });
    });

    it('recording claim progress keeps the version and the content', async () => {
      await saveDraft(input());
      saveClaim({ step: 'form_created', formId: 'f1' });
      expect(loadDraft()).toMatchObject({ version: 1, title: 'Contact' });
    });

    it('reads the version a storage event carries', () => {
      expect(versionOfRaw(null)).toBeNull();
      expect(versionOfRaw('{nope')).toBeNull();
      expect(versionOfRaw(JSON.stringify({ v: 1, version: 7 }))).toBe(7);
    });
  });
});
