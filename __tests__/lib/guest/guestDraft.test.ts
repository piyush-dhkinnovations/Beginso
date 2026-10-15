import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DRAFT_MAX_BYTES, DRAFT_TTL_MS, clearDraft, loadDraft, putImage, saveClaim, saveDraft, type DraftInput } from '@/lib/guest/guestDraft';
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
    expect(await saveDraft(input())).toEqual({ ok: true, persisted: true });
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
    expect(await saveDraft(input())).toEqual({ ok: true, persisted: false });
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
});
