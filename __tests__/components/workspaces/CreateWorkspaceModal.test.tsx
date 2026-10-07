/**
 * __tests__/components/workspaces/CreateWorkspaceModal.test.tsx
 * Feature: sprint-8-workspaces-context, requirements.md §7.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CreateWorkspaceModal } from '@/components/workspaces/CreateWorkspaceModal';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockCreate = vi.fn();
vi.mock('@/services/workspaces', () => ({
  workspacesService: { create: (...args: unknown[]) => mockCreate(...args) },
}));

const mockToast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

function renderModal(props: { isOpen: boolean; onClose: () => void }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateWorkspaceModal {...props} />
    </QueryClientProvider>
  );
}

describe('CreateWorkspaceModal', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockCreate.mockReset();
    mockToast.mockReset();
  });

  it('validates a required name before submitting', async () => {
    const user = userEvent.setup();
    renderModal({ isOpen: true, onClose: vi.fn() });

    await user.click(screen.getByRole('button', { name: /Create workspace/ }));

    expect(await screen.findByText('Workspace name is required')).toBeInTheDocument();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('creates the workspace and navigates to /w/:slug on success', async () => {
    mockCreate.mockResolvedValue({ id: 'w1', name: 'Acme', slug: 'acme', timezone: 'UTC', createdAt: '', updatedAt: '' });
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderModal({ isOpen: true, onClose });

    await user.type(screen.getByLabelText('Workspace name'), 'Acme');
    await user.click(screen.getByRole('button', { name: /Create workspace/ }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalledWith({ name: 'Acme' }));
    expect(onClose).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith('/w/acme');
  });

  it('shows a toast and keeps the modal open on failure', async () => {
    mockCreate.mockRejectedValue(new Error('network'));
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderModal({ isOpen: true, onClose });

    await user.type(screen.getByLabelText('Workspace name'), 'Acme');
    await user.click(screen.getByRole('button', { name: /Create workspace/ }));

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Failed to create workspace. Please try again.', 'error'));
    expect(onClose).not.toHaveBeenCalled();
  });
});
