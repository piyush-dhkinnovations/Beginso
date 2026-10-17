/**
 * Guest builder: Save re-checks the session before showing the sign-up gate (A10-006), and the header keeps the name field on
 * its own full-width row below the large breakpoint so it can never be squeezed to a sliver (A10-001 / A10-002; the real
 * pixel check is done in a browser, jsdom has no layout).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const router = vi.hoisted(() => ({ replace: vi.fn(), push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: false }) }));
vi.mock('@/components/form-builder/useBuilderUndoShortcuts', () => ({ useBuilderUndoShortcuts: () => undefined }));
vi.mock('@/components/guest/SimpleCanvas', () => ({ SimpleCanvas: () => null, addQuestionToActive: vi.fn() }));
vi.mock('@/components/guest/EditorPanels', () => ({ LeftPanel: () => null, RightPanel: () => null }));
vi.mock('@/components/guest/DesignDrawer', () => ({ DesignDrawer: () => null }));
vi.mock('@/components/guest/GuestPreviewOverlay', () => ({ GuestPreviewOverlay: () => null }));
vi.mock('@/components/guest/GuestAccountModal', () => ({
  CLAIM_PATH: '/forms/claim',
  GuestAccountModal: ({ isOpen }: { isOpen: boolean }) => (isOpen ? <div role="dialog">Create your account</div> : null),
}));
vi.mock('@/lib/guest/funnel', () => ({ trackFunnel: vi.fn() }));
const probeSession = vi.hoisted(() => vi.fn());
vi.mock('@/services/auth', () => ({ authService: { probeSession: (...a: unknown[]) => probeSession(...a) } }));

import GuestBuilderPage from '@/app/try/build/page';
import { clearDraft, saveDraft } from '@/lib/guest/guestDraft';
import { memoryBlobStore, setBlobStore } from '@/lib/guest/blobStore';

beforeEach(async () => {
  setBlobStore(memoryBlobStore());
  await clearDraft();
  await saveDraft({ title: 'Original', fields: [], pages: [{ id: 'p', order: 0 }], settings: { honeypotEnabled: true }, branding: {}, designed: true });
  router.push.mockReset();
  probeSession.mockReset();
});

const clickSave = async () => {
  render(<GuestBuilderPage />);
  await waitFor(() => expect(screen.getAllByText('Saved on this device').length).toBeGreaterThan(0));
  fireEvent.click(screen.getByRole('button', { name: 'Save to my account' }));
};

describe('Save after signing in somewhere else', () => {
  it('goes straight to the claim page when the server says the person is signed in', async () => {
    probeSession.mockResolvedValue({ user: { id: 'u1' } });
    await clickSave();
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/forms/claim'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the sign-up gate when nobody is signed in', async () => {
    probeSession.mockResolvedValue({ user: null });
    await clickSave();
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('shows the gate when the session check itself fails', async () => {
    probeSession.mockRejectedValue(new Error('down'));
    await clickSave();
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});

describe('header layout', () => {
  it('puts the form name on its own full-width row below lg and the status on its own line', async () => {
    render(<GuestBuilderPage />);
    const input = await screen.findByLabelText('Form name');
    const row = input.closest('[class*="order-last"]');
    expect(row?.className).toMatch(/w-full/);
    expect(screen.getAllByRole('status').some((s) => s.parentElement?.className.includes('lg:hidden'))).toBe(true);
  });

  it('keeps the primary button named "Save to my account" while showing just "Save" on a phone', async () => {
    render(<GuestBuilderPage />);
    const button = await screen.findByRole('button', { name: 'Save to my account' });
    expect(button.textContent).toContain('Save');
    expect(Array.from(button.querySelectorAll('span')).map((x) => x.textContent)).toEqual(['Save', 'Save to my account']);
  });
});
