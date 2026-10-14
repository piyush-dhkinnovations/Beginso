import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateFormPage } from '@/components/forms/CreateFormPage';
import { useBuilderStore } from '@/store/builderStore';

const nav = vi.hoisted(() => ({ ws: null as string | null, push: vi.fn(), back: vi.fn() }));
const createForm = vi.hoisted(() => vi.fn());
const getWorkspace = vi.hoisted(() => vi.fn());
const listWorkspaces = vi.hoisted(() => vi.fn());
const toast = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: nav.push, back: nav.back }),
  useSearchParams: () => ({ get: (k: string) => (k === 'ws' ? nav.ws : null) }),
}));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
vi.mock('@/services/forms', () => ({ formsService: { createForm: (...a: unknown[]) => createForm(...a) } }));
vi.mock('@/services/settings', () => ({ settingsService: { getWorkspace: (...a: unknown[]) => getWorkspace(...a) } }));
vi.mock('@/services/workspaces', () => ({ workspacesService: { list: (...a: unknown[]) => listWorkspaces(...a) } }));
vi.mock('@/components/flow/FlowIllustrations', () => ({ FormIllustration: () => null }));
vi.mock('@/components/forms/FormMarkPicker', () => ({
  FormMarkPicker: ({ onChange }: { onChange: (v: object) => void }) => (
    <>
      <button type="button" onClick={() => onChange({ logoUrl: '/logo.png' })}>choose-logo</button>
      <button type="button" onClick={() => onChange({ logoUrl: null, iconName: 'rocket' })}>choose-icon</button>
    </>
  ),
}));

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const spy = vi.spyOn(qc, 'invalidateQueries');
  render(
    <QueryClientProvider client={qc}>
      <CreateFormPage />
    </QueryClientProvider>
  );
  return { spy };
}

describe('CreateFormPage', () => {
  beforeEach(() => {
    nav.ws = null;
    nav.push.mockReset();
    nav.back.mockReset();
    toast.mockReset();
    createForm.mockReset().mockResolvedValue({ _id: 'new1', title: 'My form' });
    getWorkspace.mockReset().mockResolvedValue({ branding: { primaryColor: '#abcdef' } });
    listWorkspaces.mockReset().mockResolvedValue([{ id: 'w1', slug: 'acme', name: 'Acme' }]);
    useBuilderStore.setState(useBuilderStore.getInitialState(), true);
  });

  it('renders the heading, labelled fields and a submit button', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Create a new form' })).toBeInTheDocument();
    expect(screen.getByLabelText('Form Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Description (optional)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Form/ })).toBeInTheDocument();
  });

  it('validates a missing title and does not call the API', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /Create Form/ }));
    expect(await screen.findByText('Form title is required')).toBeInTheDocument();
    expect(createForm).not.toHaveBeenCalled();
  });

  it('rejects a title over 200 characters', async () => {
    renderPage();
    await userEvent.click(screen.getByLabelText('Form Title'));
    await userEvent.paste('x'.repeat(201));
    await userEvent.click(screen.getByRole('button', { name: /Create Form/ }));
    expect(await screen.findByText('Title must be 200 characters or less')).toBeInTheDocument();
    expect(createForm).not.toHaveBeenCalled();
  });

  it('creates a personal form, seeds the builder store and opens the builder', async () => {
    const { spy } = renderPage();
    await userEvent.type(screen.getByLabelText('Form Title'), 'My form');
    await userEvent.click(screen.getByRole('button', { name: /Create Form/ }));

    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/forms/new1/edit'));
    expect(createForm).toHaveBeenCalledWith(expect.objectContaining({
      title: 'My form',
      destination: { type: 'personal' },
      destinationWorkspaceId: null,
    }));
    // Nothing was picked, so the form gets only the icon that suits its name.
    expect(createForm.mock.calls[0][0].branding).toEqual({ iconName: 'common-file-text' });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['forms'] });
    const seeded = useBuilderStore.getState();
    expect(seeded).toMatchObject({ formId: 'new1', formTitle: 'My form', status: 'draft', fields: [] });
  });

  it('sends the chosen logo as branding', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText('Form Title'), 'My form');
    await userEvent.click(screen.getByText('choose-logo'));
    await userEvent.click(screen.getByRole('button', { name: /Create Form/ }));
    await waitFor(() => expect(createForm).toHaveBeenCalled());
    expect(createForm.mock.calls[0][0].branding).toEqual({ logoUrl: '/logo.png' });
  });

  it('sends a chosen icon and colour as branding (no logo)', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText('Form Title'), 'My form');
    await userEvent.click(screen.getByText('choose-icon'));
    await userEvent.click(screen.getByRole('button', { name: /Create Form/ }));
    await waitFor(() => expect(createForm).toHaveBeenCalled());
    expect(createForm.mock.calls[0][0].branding).toEqual({ iconName: 'rocket' });
  });

  it('left untouched, the form gets the icon that suits its name', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText('Form Title'), 'Event Registration');
    await userEvent.click(screen.getByRole('button', { name: /Create Form/ }));
    await waitFor(() => expect(createForm).toHaveBeenCalled());
    expect(createForm.mock.calls[0][0].branding).toEqual({ iconName: 'calendar-1' });
  });

  it('a name that says nothing gets the plain document icon', async () => {
    renderPage();
    await userEvent.type(screen.getByLabelText('Form Title'), 'My form');
    await userEvent.click(screen.getByRole('button', { name: /Create Form/ }));
    await waitFor(() => expect(createForm).toHaveBeenCalled());
    expect(createForm.mock.calls[0][0].branding).toEqual({ iconName: 'common-file-text' });
  });

  it('creates inside the workspace named by ?ws=, inheriting its branding, and keeps ?ws= on the builder URL', async () => {
    nav.ws = 'acme';
    renderPage();
    expect(await screen.findByText(/It will be created in Acme\./)).toBeInTheDocument();
    await waitFor(() => expect(getWorkspace).toHaveBeenCalled());
    await userEvent.type(screen.getByLabelText('Form Title'), 'My form');
    await userEvent.click(screen.getByText('choose-logo'));
    await userEvent.click(screen.getByRole('button', { name: /Create Form/ }));

    await waitFor(() => expect(nav.push).toHaveBeenCalledWith('/forms/new1/edit?ws=acme'));
    expect(createForm).toHaveBeenCalledWith(expect.objectContaining({
      destination: { type: 'workspace', workspaceId: 'w1' },
      destinationWorkspaceId: 'w1',
      branding: { primaryColor: '#abcdef', logoUrl: '/logo.png' },
    }));
    expect(useBuilderStore.getState().branding).toEqual({ primaryColor: '#abcdef', logoUrl: '/logo.png' });
  });

  it('shows an error toast and stays on the page when creation fails', async () => {
    createForm.mockRejectedValue(new Error('boom'));
    renderPage();
    await userEvent.type(screen.getByLabelText('Form Title'), 'My form');
    await userEvent.click(screen.getByRole('button', { name: /Create Form/ }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Failed to create form. Please try again.', 'error'));
    expect(nav.push).not.toHaveBeenCalled();
  });

  it('Cancel goes back in history when there is some', async () => {
    window.history.pushState({}, '', '/a');
    window.history.pushState({}, '', '/b');
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(nav.back).toHaveBeenCalled();
  });
});
