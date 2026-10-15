import type { FormBranding } from '@/types/form';
import { IMAGE_KEYS, type ClaimState, type ClaimStep, type GuestDraft, type ImageKey } from './guestDraft';

// Moves a guest draft onto the server, one durable step at a time:
//   draft_ready -> form_created(formId) -> content_saved -> assets_uploaded -> branding_linked -> done
// The formId is saved the moment the form exists, so a retry after any failure resumes instead of creating a
// second form. Create is the documented minimal call (title + personal destination); the content goes in through
// the same PATCH the builder's autosave uses, so it gets the same validation and branding sanitising.
// Nothing here deletes the local draft until the last step has succeeded.

export interface ClaimDeps {
  createForm(payload: { title: string; destinationWorkspaceId: null }): Promise<{ _id: string }>;
  saveContent(formId: string, content: Pick<GuestDraft, 'title' | 'fields' | 'pages' | 'settings' | 'branding'>): Promise<unknown>;
  uploadImage(blob: Blob): Promise<{ url: string }>;
  updateBranding(formId: string, branding: FormBranding): Promise<unknown>;
  getBlob(key: ImageKey): Promise<Blob | undefined>;
  /** Persist progress (called after every completed step). */
  saveClaim(claim: ClaimState): void;
  /** Called once, after `done`: removes the local draft and blobs. */
  finish(): Promise<void>;
}

export type ClaimResult =
  | { status: 'done'; formId: string }
  /** The form exists but some images did not upload; draft is kept so they can be retried. */
  | { status: 'partial'; formId: string; failed: ImageKey[] };

const ORDER: ClaimStep[] = ['draft_ready', 'form_created', 'content_saved', 'assets_uploaded', 'branding_linked', 'done'];
const reached = (claim: ClaimState, step: ClaimStep) => ORDER.indexOf(claim.step) >= ORDER.indexOf(step);

export async function runClaim(draft: GuestDraft, deps: ClaimDeps): Promise<ClaimResult> {
  let claim: ClaimState = { ...draft.claim };
  const advance = (next: Partial<ClaimState> & { step: ClaimStep }) => {
    claim = { ...claim, ...next };
    deps.saveClaim(claim);
  };

  const title = draft.title.trim().length >= 3 ? draft.title.trim() : 'Untitled form';
  if (!reached(claim, 'form_created')) {
    const created = await deps.createForm({ title, destinationWorkspaceId: null }); // null = personal space, even for a workspace member
    advance({ step: 'form_created', formId: created._id });
  }
  const formId = claim.formId!;

  if (!reached(claim, 'content_saved')) {
    await deps.saveContent(formId, { title, fields: draft.fields.filter((f) => !f.deleted), pages: draft.pages, settings: draft.settings, branding: draft.branding });
    advance({ step: 'content_saved' });
  }

  const failed: ImageKey[] = [];
  const uploaded = { ...claim.uploaded };
  if (!reached(claim, 'assets_uploaded')) {
    for (const key of draft.imageKeys) {
      if (uploaded[key]) continue;
      try {
        const blob = await deps.getBlob(key);
        if (!blob) throw new Error('image missing');
        uploaded[key] = (await deps.uploadImage(blob)).url;
        advance({ step: 'content_saved', uploaded });
      } catch {
        failed.push(key);
      }
    }
    if (failed.length) return { status: 'partial', formId, failed };
    advance({ step: 'assets_uploaded', uploaded });
  }

  if (!reached(claim, 'branding_linked')) {
    const urls = IMAGE_KEYS.filter((k) => uploaded[k]);
    if (urls.length) await deps.updateBranding(formId, { ...draft.branding, ...Object.fromEntries(urls.map((k) => [k, uploaded[k]])) });
    advance({ step: 'branding_linked' });
  }

  await deps.finish();
  return { status: 'done', formId };
}
