import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush, back: mockBack }) }));

const mockCreate = vi.fn();
vi.mock('@/services/workspaces', () => ({ workspacesService: { create: (...a: unknown[]) => mockCreate(...a) } }));

const mockToast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: mockToast }) }));

vi.mock('@/components/flow/LogoChoice', () => ({
  LogoChoice: ({ value, onChange, disabled }: { value: string | null; onChange: (u: string | null) => void; disabled?: boolean }) => (
    <div data-testid="logo" data-value={value ?? ''} data-disabled={String(!!disabled)}>
      <button type="button" onClick={() => onChange('https://cdn/logo.png')}>pick-logo</button>
    </div>
  ),
}));

import { CreateWorkspacePage } from '@/components/workspaces/CreateWorkspacePage';

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  render(<QueryClientProvider client={qc}><CreateWorkspacePage /></QueryClientProvider>);
  return { invalidate };
}

describe('CreateWorkspacePage', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockBack.mockReset();
    mockCreate.mockReset();
    mockToast.mockReset();
  });

  it('renders the heading, name field and submit button', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Create a workspace' })).toBeInTheDocument();
    expect(screen.getByLabelText('Workspace name')).toHaveFocus();
    expect(screen.getByRole('button', { name: /Create workspace/ })).toBeInTheDocument();
  });

  it('validates a required name', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole('button', { name: /Create workspace/ }));
    expect(await screen.findByText('Workspace name is required')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('rejects a name over 100 characters', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByLabelText('Workspace name'));
    await user.paste('a'.repeat(101));
    await user.click(screen.getByRole('button', { name: /Create workspace/ }));
    expect(await screen.findByText('Name must be 100 characters or less')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('creates without a logo, refreshes the list and goes to the workspace', async () => {
    const user = userEvent.setup();
    mockCreate.mockResolvedValue({ id: 'w1', slug: 'acme' });
    const { invalidate } = setup();
    await user.type(screen.getByLabelText('Workspace name'), '  Acme  ');
    await user.click(screen.getByRole('button', { name: /Create workspace/ }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/w/acme'));
    expect(mockCreate).toHaveBeenCalledWith({ name: 'Acme' });
    expect(invalidate).toHaveBeenCalled();
  });

  it('includes the chosen logo in the request', async () => {
    const user = userEvent.setup();
    mockCreate.mockResolvedValue({ id: 'w1', slug: 'acme' });
    setup();
    await user.type(screen.getByLabelText('Workspace name'), 'Acme');
    await user.click(screen.getByText('pick-logo'));
    expect(screen.getByTestId('logo')).toHaveAttribute('data-value', 'https://cdn/logo.png');
    await user.click(screen.getByRole('button', { name: /Create workspace/ }));
    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({ name: 'Acme', logo: 'https://cdn/logo.png' }));
  });

  it('shows an error toast and stays put when creation fails', async () => {
    const user = userEvent.setup();
    mockCreate.mockRejectedValue(new Error('nope'));
    setup();
    await user.type(screen.getByLabelText('Workspace name'), 'Acme');
    await user.click(screen.getByRole('button', { name: /Create workspace/ }));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Failed to create workspace. Please try again.', 'error'));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('Cancel goes back when there is history, otherwise to /workspaces', async () => {
    const user = userEvent.setup();
    setup();
    Object.defineProperty(window.history, 'length', { value: 3, configurable: true });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockBack).toHaveBeenCalled();
    Object.defineProperty(window.history, 'length', { value: 1, configurable: true });
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(mockPush).toHaveBeenCalledWith('/workspaces');
  });
});
