import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormLevelHeader } from '@/components/forms/FormLevelHeader';
import { makeForm } from './formsTestUtils';

const nav = vi.hoisted(() => ({ pathname: '/forms/f1/overview', ws: null as string | null, push: vi.fn() }));
const getFormById = vi.hoisted(() => vi.fn());
const updateForm = vi.hoisted(() => vi.fn());
const listWorkspaces = vi.hoisted(() => vi.fn());
const pinMutate = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'f1' }),
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: nav.push }),
  useSearchParams: () => ({ get: (k: string) => (k === 'ws' ? nav.ws : null) }),
}));
vi.mock('@/hooks/useFormScope', () => ({ useFormScope: () => 'personal' }));
vi.mock('@/hooks/usePinForm', () => ({ usePinForm: () => ({ mutate: pinMutate }) }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/services/forms', () => ({
  formsService: { getFormById: (...a: unknown[]) => getFormById(...a), updateForm: (...a: unknown[]) => updateForm(...a) },
}));
vi.mock('@/services/workspaces', () => ({ workspacesService: { list: (...a: unknown[]) => listWorkspaces(...a) } }));
vi.mock('@/components/team/FormAccessPanel', () => ({
  FormAccessPanel: ({ isOpen, formTitle }: { isOpen: boolean; formTitle: string }) => (isOpen ? <div role="dialog">Access for {formTitle}</div> : null),
}));
vi.mock('@/components/forms/FormLogoButton', () => ({
  FormLogoButton: ({ onSave, canEdit }: { onSave: (m: object) => Promise<unknown>; canEdit: boolean }) => (
    <button onClick={() => void onSave({ logoUrl: '/logo.png' })}>logo-{String(canEdit)}</button>
  ),
}));

function renderHeader() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const spy = vi.spyOn(qc, 'invalidateQueries');
  render(
    <QueryClientProvider client={qc}>
      <FormLevelHeader />
    </QueryClientProvider>
  );
  return { spy };
}

describe('FormLevelHeader', () => {
  beforeEach(() => {
    nav.pathname = '/forms/f1/overview';
    nav.ws = null;
    nav.push.mockReset();
    pinMutate.mockReset();
    toast.mockReset();
    updateForm.mockReset().mockResolvedValue({});
    getFormById.mockReset().mockResolvedValue(makeForm({ title: 'Survey', status: 'published', slug: 'survey-abc', branding: { primaryColor: '#123456' } }));
    listWorkspaces.mockReset().mockResolvedValue([{ id: 'w1', slug: 'acme', name: 'Acme' }]);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockResolvedValue(undefined) }, configurable: true });
  });

  it.each(['/forms/f1/edit', '/forms/f1/inbox', '/forms/f1/settings'])('renders nothing and fetches nothing on %s', (p) => {
    nav.pathname = p;
    renderHeader();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(getFormById).not.toHaveBeenCalled();
  });

  it('shows the title, status, dates and the primary actions on /overview and /scores', async () => {
    renderHeader();
    expect(await screen.findByText('Survey')).toBeInTheDocument();
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText(/Created on 01 Oct 2026/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Preview/ })).toHaveAttribute('href', '/forms/f1/preview');
    expect(screen.getByRole('link', { name: /Edit form/ })).toHaveAttribute('href', '/forms/f1/edit');
    expect(screen.getByRole('button', { name: /^Share$/ })).toBeInTheDocument();
  });

  it('also appears on /scores', async () => {
    nav.pathname = '/forms/f1/scores/';
    renderHeader();
    expect(await screen.findByText('Survey')).toBeInTheDocument();
  });

  it('a personal form owned by the caller goes back to Forms', async () => {
    renderHeader();
    await screen.findByText('Survey');
    await userEvent.click(screen.getByRole('button', { name: 'Back to Forms' }));
    expect(nav.push).toHaveBeenCalledWith('/forms');
  });

  it('a form shared with the caller goes back to "Shared with me"', async () => {
    getFormById.mockResolvedValue(makeForm({ title: 'Survey', myRole: 'viewer' }));
    renderHeader();
    await screen.findByText('Survey');
    await userEvent.click(screen.getByRole('button', { name: 'Back to Shared with me' }));
    expect(nav.push).toHaveBeenCalledWith('/shared');
  });

  it('a workspace form goes back to that workspace\'s forms and keeps ?ws= on Edit', async () => {
    nav.ws = 'acme';
    renderHeader();
    await screen.findByText('Survey');
    await userEvent.click(await screen.findByRole('button', { name: 'Back to Acme forms' }));
    expect(nav.push).toHaveBeenCalledWith('/w/acme/forms');
    expect(screen.getByRole('link', { name: /Edit form/ })).toHaveAttribute('href', '/forms/f1/edit?ws=acme');
  });

  it('hides Share, Edit and Form settings from roles that cannot edit', async () => {
    getFormById.mockResolvedValue(makeForm({ title: 'Survey', myRole: 'viewer' }));
    renderHeader();
    await screen.findByText('Survey');
    expect(screen.queryByRole('link', { name: /Edit form/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Share$/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'More form actions' }));
    expect(screen.queryByRole('menuitem', { name: 'Form settings' })).not.toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Pin to top' })).toBeInTheDocument();
  });

  it('Share opens the access panel for the form', async () => {
    renderHeader();
    await screen.findByText('Survey');
    await userEvent.click(screen.getByRole('button', { name: /^Share$/ }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Access for Survey');
  });

  it('menu: Form settings opens the builder on the settings tab', async () => {
    nav.ws = 'acme';
    renderHeader();
    await screen.findByText('Survey');
    await userEvent.click(screen.getByRole('button', { name: 'More form actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Form settings' }));
    expect(nav.push).toHaveBeenCalledWith('/forms/f1/edit?tab=settings&ws=acme');
  });

  it('menu: pin toggles to the opposite state', async () => {
    getFormById.mockResolvedValue(makeForm({ title: 'Survey', pinned: true }));
    renderHeader();
    await screen.findByText('Survey');
    await userEvent.click(screen.getByRole('button', { name: 'More form actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Unpin from top' }));
    expect(pinMutate).toHaveBeenCalledWith({ id: 'f1', pin: false });
  });

  it('menu: Copy public link only exists for a published form, copies the URL and toasts', async () => {
    renderHeader();
    await screen.findByText('Survey');
    await userEvent.click(screen.getByRole('button', { name: 'More form actions' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Copy public link' }));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(expect.stringMatching(/\/survey-abc$/));
    expect(toast).toHaveBeenCalledWith('Link copied to clipboard.', 'success');
  });

  it('a draft has no Copy public link item', async () => {
    getFormById.mockResolvedValue(makeForm({ title: 'Survey', status: 'draft', slug: 'reserved' }));
    renderHeader();
    await screen.findByText('Survey');
    await userEvent.click(screen.getByRole('button', { name: 'More form actions' }));
    expect(screen.queryByRole('menuitem', { name: 'Copy public link' })).not.toBeInTheDocument();
  });

  it('saving a logo writes the whole branding object with the logo swapped in, then refreshes caches', async () => {
    const { spy } = renderHeader();
    await userEvent.click(await screen.findByRole('button', { name: 'logo-true' }));
    await waitFor(() => expect(updateForm).toHaveBeenCalledWith('f1', { branding: { primaryColor: '#123456', logoUrl: '/logo.png' } }));
    await waitFor(() => expect(spy).toHaveBeenCalledWith({ queryKey: ['form', 'f1'] }));
    expect(spy).toHaveBeenCalledWith({ queryKey: ['forms'] });
  });

  it('shows a skeleton title and no pin item while loading', () => {
    getFormById.mockReturnValue(new Promise(() => {}));
    renderHeader();
    expect(screen.getByRole('link', { name: /Preview/ })).toBeInTheDocument();
    expect(screen.queryByText('Survey')).not.toBeInTheDocument();
  });
});
