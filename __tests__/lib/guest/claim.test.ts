import { describe, expect, it, vi } from 'vitest';
import { runClaim, type ClaimDeps } from '@/lib/guest/claim';
import type { ClaimState, GuestDraft } from '@/lib/guest/guestDraft';

const draft = (over: Partial<GuestDraft> = {}): GuestDraft => ({
  v: 1, createdAt: 0, updatedAt: 0, title: 'Contact', pages: [{ id: 'p', order: 0 }], settings: { honeypotEnabled: true },
  fields: [
    { fieldId: 'a', pageId: 'p', type: 'short_text', label: 'A', required: false, deleted: false, order: 0 },
    { fieldId: 'gone', pageId: 'p', type: 'short_text', label: 'G', required: false, deleted: true, order: 1 },
  ],
  branding: { primaryColor: '#111111' }, imageKeys: [], designed: true, claim: { step: 'draft_ready' }, ...over,
});

function deps(over: Partial<ClaimDeps> = {}) {
  let saved: ClaimState = { step: 'draft_ready' };
  const d: ClaimDeps = {
    createForm: vi.fn(async () => ({ _id: 'F1' })),
    saveContent: vi.fn(async () => undefined),
    uploadImage: vi.fn(async () => ({ url: 'https://cdn/x.png' })),
    updateBranding: vi.fn(async () => undefined),
    getBlob: vi.fn(async () => new Blob(['x'], { type: 'image/png' })),
    saveClaim: vi.fn((c: ClaimState) => void (saved = c)),
    finish: vi.fn(async () => undefined),
    ...over,
  };
  return { d, saved: () => saved };
}

const boom = () => vi.fn(async () => { throw new Error('boom'); });

describe('runClaim', () => {
  it('creates the form in the personal space, saves content without deleted fields, then clears the draft', async () => {
    const { d } = deps();
    expect(await runClaim(draft(), d)).toEqual({ status: 'done', formId: 'F1' });
    expect(d.createForm).toHaveBeenCalledWith({ title: 'Contact', destinationWorkspaceId: null });
    const content = (d.saveContent as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(content.fields.map((f: { fieldId: string }) => f.fieldId)).toEqual(['a']);
    expect(d.finish).toHaveBeenCalledOnce();
  });

  it.each([['saveContent'], ['updateBranding']] as const)('resumes after %s fails without creating a second form', async (failing) => {
    const withLogo = draft({ imageKeys: ['logoUrl'] });
    const first = deps({ [failing]: boom() });
    await expect(runClaim(withLogo, first.d)).rejects.toThrow('boom');
    expect(first.d.finish).not.toHaveBeenCalled(); // the draft survives

    const second = deps();
    await runClaim({ ...withLogo, claim: first.saved() }, second.d);
    expect(second.d.createForm).not.toHaveBeenCalled();
    expect(second.d.finish).toHaveBeenCalledOnce();
  });

  it('keeps the draft and the formId when creation succeeded but content failed', async () => {
    const first = deps({ saveContent: boom() });
    await expect(runClaim(draft(), first.d)).rejects.toThrow();
    expect(first.saved()).toMatchObject({ step: 'form_created', formId: 'F1' });
  });

  it('uploads images, links their URLs, and keeps the draft if an upload fails', async () => {
    const ok = deps();
    await runClaim(draft({ imageKeys: ['logoUrl'] }), ok.d);
    expect(ok.d.updateBranding).toHaveBeenCalledWith('F1', { primaryColor: '#111111', logoUrl: 'https://cdn/x.png' });

    const bad = deps({ uploadImage: boom() });
    expect(await runClaim(draft({ imageKeys: ['logoUrl'] }), bad.d)).toEqual({ status: 'partial', formId: 'F1', failed: ['logoUrl'] });
    expect(bad.d.finish).not.toHaveBeenCalled();
  });

  it('does not re-upload an image that already uploaded', async () => {
    const { d } = deps();
    await runClaim(draft({ imageKeys: ['logoUrl'], claim: { step: 'content_saved', formId: 'F1', uploaded: { logoUrl: 'https://cdn/old.png' } } }), d);
    expect(d.uploadImage).not.toHaveBeenCalled();
    expect(d.updateBranding).toHaveBeenCalledWith('F1', expect.objectContaining({ logoUrl: 'https://cdn/old.png' }));
  });

  it('falls back to a valid title when the draft title is too short', async () => {
    const { d } = deps();
    await runClaim(draft({ title: 'a' }), d);
    expect(d.createForm).toHaveBeenCalledWith({ title: 'Untitled form', destinationWorkspaceId: null });
  });
});
