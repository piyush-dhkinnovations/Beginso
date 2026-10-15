import type { FormBranding, FormField, FormPage, FormSettings } from '@/types/form';
import { getBlobStore } from './blobStore';

// The logged-out visitor's form. It lives ONLY in this browser (localStorage for the JSON, IndexedDB for image
// bytes) until they sign up and /forms/claim creates it on the server. Every read and write is wrapped:
// storage can be blocked (private window) and then the draft lives in memory until the tab closes.

export const DRAFT_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const DRAFT_MAX_BYTES = 8 * 1024 * 1024;
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // POST /api/upload's own limit
const KEY = 'beginso.guestDraft.v1';

export const IMAGE_KEYS = ['logoUrl', 'coverImageUrl', 'backgroundImageUrl'] as const;
export type ImageKey = (typeof IMAGE_KEYS)[number];

export type ClaimStep = 'draft_ready' | 'form_created' | 'content_saved' | 'assets_uploaded' | 'branding_linked' | 'done';
export interface ClaimState {
  step: ClaimStep;
  formId?: string;
  /** Server URLs of images already uploaded, so a retry never uploads the same one twice. */
  uploaded?: Partial<Record<ImageKey, string>>;
}

export interface GuestDraft {
  v: 1;
  createdAt: number;
  updatedAt: number;
  title: string;
  fields: FormField[];
  pages: FormPage[];
  settings: FormSettings;
  /** Branding with image URLs removed; `imageKeys` says which images are waiting in the blob store. */
  branding: FormBranding;
  imageKeys: ImageKey[];
  /** The first-run "Choose a look" step has been completed or skipped. */
  designed: boolean;
  claim: ClaimState;
}

export type DraftInput = Pick<GuestDraft, 'title' | 'fields' | 'pages' | 'settings' | 'designed'> & { branding: FormBranding; createdAt?: number; claim?: ClaimState };
export type SaveResult = { ok: true; persisted: boolean } | { ok: false; reason: 'too_large' };

let memory: string | null = null;
let persistent = true;

function read(): string | null {
  try {
    return localStorage.getItem(KEY) ?? memory;
  } catch {
    persistent = false;
    return memory;
  }
}

function write(json: string) {
  memory = json;
  try {
    localStorage.setItem(KEY, json);
    persistent = true;
  } catch {
    persistent = false;
  }
}

/** False once storage has refused a write: the draft is then lost when the tab closes, and the UI says so. */
export const isDraftPersistent = () => persistent;

export function loadDraft(now = Date.now()): GuestDraft | null {
  const raw = read();
  if (!raw) return null;
  try {
    const d = JSON.parse(raw) as GuestDraft;
    if (d?.v !== 1 || !Array.isArray(d.fields) || !Array.isArray(d.pages)) throw new Error('shape');
    if (now - d.updatedAt > DRAFT_TTL_MS) throw new Error('expired');
    return d;
  } catch {
    void clearDraft();
    return null;
  }
}

const isBlobUrl = (v: unknown): v is string => typeof v === 'string' && v.startsWith('blob:');

export async function saveDraft(input: DraftInput, now = Date.now()): Promise<SaveResult> {
  const branding = { ...input.branding };
  const imageKeys: ImageKey[] = [];
  for (const k of IMAGE_KEYS) {
    if (isBlobUrl(branding[k])) imageKeys.push(k);
    if (isBlobUrl(branding[k]) || branding[k] === undefined) delete branding[k];
  }
  // An image the person removed or replaced must not keep counting against the size cap, nor get uploaded later.
  for (const k of IMAGE_KEYS) if (!imageKeys.includes(k)) await removeImage(k);
  const previous = loadDraft(now);
  const draft: GuestDraft = {
    v: 1,
    createdAt: input.createdAt ?? previous?.createdAt ?? now,
    updatedAt: now,
    title: input.title,
    fields: input.fields,
    pages: input.pages,
    settings: input.settings,
    branding,
    imageKeys,
    designed: input.designed,
    claim: input.claim ?? previous?.claim ?? { step: 'draft_ready' },
  };
  const json = JSON.stringify(draft);
  const blobs = await (await getBlobStore()).totalBytes().catch(() => 0);
  if (json.length + blobs > DRAFT_MAX_BYTES) return { ok: false, reason: 'too_large' };
  write(json);
  return { ok: true, persisted: persistent };
}

/** Update only the claim bookkeeping (formId, step) without touching the content. */
export function saveClaim(claim: ClaimState, now = Date.now()) {
  const d = loadDraft(now);
  if (d) write(JSON.stringify({ ...d, claim }));
}

export async function clearDraft() {
  memory = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage blocked: nothing to remove */
  }
  try {
    await (await getBlobStore()).clear();
  } catch {
    /* nothing stored */
  }
}

/** Branding with object URLs rebuilt for the images still waiting in the blob store. */
export async function hydrateBranding(draft: GuestDraft): Promise<FormBranding> {
  const branding = { ...draft.branding };
  const store = await getBlobStore();
  for (const k of draft.imageKeys) {
    const blob = await store.get(k).catch(() => undefined);
    if (blob) branding[k] = URL.createObjectURL(blob);
  }
  return branding;
}

/** Validates like the server will (images only, 5 MB) and parks the file; returns an object URL to preview it. */
export async function putImage(key: ImageKey, file: Blob): Promise<{ url: string } | { error: string }> {
  if (!file.type.startsWith('image/')) return { error: 'That file is not an image. Use JPG, PNG, GIF or WEBP.' };
  if (file.size > IMAGE_MAX_BYTES) return { error: 'That image is too large. Use one under 5 MB.' };
  const store = await getBlobStore();
  const others = (await store.totalBytes().catch(() => 0)) - ((await store.get(key).catch(() => undefined))?.size ?? 0);
  const json = read()?.length ?? 0;
  if (others + file.size + json > DRAFT_MAX_BYTES) return { error: 'This device can hold about 8 MB of draft. Use a smaller image, or sign up to keep more.' };
  await store.put(key, file);
  return { url: URL.createObjectURL(file) };
}

export async function removeImage(key: ImageKey) {
  await (await getBlobStore()).remove(key).catch(() => undefined);
}
