import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ isAuthenticated: false, isLoading: false }) }));
const f = (id: string, label: string) => ({ fieldId: id, label, type: 'short_text', required: false, deleted: false, order: 0, pageId: 'p' });
const tpl = (id: string, name: string, extra = {}) => ({ _id: id, name, description: 'd', category: 'x', isActive: true, settings: { honeypotEnabled: true }, pages: [{ id: 'p', order: 0 }], fields: [f('a', 'Q')], ...extra });
vi.mock('@/hooks/usePublicTemplates', () => ({
  usePublicTemplates: () => ({ isLoading: false, error: null, data: [tpl('1', 'Contact form'), tpl('2', 'Field Showcase', { showInGallery: false })] }),
}));

import TryPage from '@/app/try/page';
import { loadDraft, saveDraft } from '@/lib/guest/guestDraft';

beforeEach(() => { localStorage.clear(); push.mockReset(); });

describe('/try pick screen', () => {
  it('hides internal templates', () => {
    render(<TryPage />);
    expect(screen.getByText('Contact form', { selector: 'span' })).toBeTruthy();
    expect(screen.queryByText('Field Showcase')).toBeNull();
  });

  it('opens the editor with one click on a card and stores the draft', async () => {
    render(<TryPage />);
    await userEvent.click(screen.getByRole('button', { name: /Contact form/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith('/try/build'));
    expect(loadDraft()?.title).toBe('Contact form');
  });

  it('asks before Start over deletes the draft', async () => {
    await saveDraft({ title: 'Mine', fields: [], pages: [{ id: 'p', order: 0 }], settings: { honeypotEnabled: true }, branding: {}, designed: true });
    render(<TryPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Start over' }));
    expect(loadDraft()).not.toBeNull(); // not yet
    await userEvent.click(screen.getByRole('button', { name: 'Delete and start again' }));
    await waitFor(() => expect(loadDraft()).toBeNull());
  });
});
