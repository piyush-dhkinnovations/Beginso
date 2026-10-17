import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';

// One router object for every render: a new one each time re-runs the page's load effect forever.
const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: false }) }));
vi.mock('@/components/form-builder/useBuilderUndoShortcuts', () => ({ useBuilderUndoShortcuts: () => undefined }));
vi.mock('@/components/guest/SimpleCanvas', () => ({ SimpleCanvas: () => null, addQuestionToActive: vi.fn() }));
vi.mock('@/components/guest/EditorPanels', () => ({ LeftPanel: () => null, RightPanel: () => null }));
vi.mock('@/components/guest/DesignDrawer', () => ({ DesignDrawer: () => null }));
vi.mock('@/components/guest/GuestPreviewOverlay', () => ({ GuestPreviewOverlay: () => null }));
vi.mock('@/components/guest/GuestAccountModal', () => ({ CLAIM_PATH: '/forms/claim', GuestAccountModal: () => null }));
vi.mock('@/lib/guest/funnel', () => ({ trackFunnel: vi.fn() }));
const probeSession = vi.hoisted(() => vi.fn());
vi.mock('@/services/auth', () => ({ authService: { probeSession: (...a: unknown[]) => probeSession(...a) } }));

import GuestBuilderPage from '@/app/try/build/page';
import { DRAFT_STORAGE_KEY, clearDraft, loadDraft, saveDraft } from '@/lib/guest/guestDraft';
import { memoryBlobStore, setBlobStore } from '@/lib/guest/blobStore';

const input = (title: string) => ({ title, fields: [], pages: [{ id: 'p', order: 0 }], settings: { honeypotEnabled: true }, branding: {}, designed: true });
// What another tab's save does to localStorage; a real `storage` event is only delivered to the OTHER tabs.
const otherTabSaves = (version: number) => {
  const draft = { ...loadDraft()!, title: 'Written in tab B', version };
  localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  act(() => {
    window.dispatchEvent(new StorageEvent('storage', { key: DRAFT_STORAGE_KEY, newValue: JSON.stringify(draft) }));
  });
};

beforeEach(async () => {
  setBlobStore(memoryBlobStore());
  await clearDraft();
  await saveDraft(input('Original')); // version 1
});

describe('guest builder: another tab saved the draft (QA A10-004)', () => {
  it('stops saving, shows the message with a Reload button, and does not overwrite the other tab', async () => {
    render(<GuestBuilderPage />);
    await waitFor(() => expect(screen.getAllByText('Saved on this device').length).toBeGreaterThan(0));

    otherTabSaves(2);
    // The header renders the status in its desktop and mobile layouts, so there are two of each.
    expect((await screen.findAllByText(/This draft changed in another tab/)).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: 'Reload' }).length).toBeGreaterThan(0);
    expect(screen.queryByText('Saved on this device')).not.toBeInTheDocument();

    // This tab's own debounced save must not run over tab B's work.
    await new Promise((r) => setTimeout(r, 1200));
    expect(loadDraft()?.title).toBe('Written in tab B');
    expect(loadDraft()?.version).toBe(2);
  });

  it('a storage event carrying the version this tab already has is ignored', async () => {
    render(<GuestBuilderPage />);
    await waitFor(() => expect(screen.getAllByText('Saved on this device').length).toBeGreaterThan(0));
    otherTabSaves(1); // same version as ours
    expect(screen.queryByText(/This draft changed in another tab/)).not.toBeInTheDocument();
  });
});
