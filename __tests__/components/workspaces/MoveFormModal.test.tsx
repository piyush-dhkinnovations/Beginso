/**
 * __tests__/components/workspaces/MoveFormModal.test.tsx
 * Feature: sprint-8-workspaces-context, requirements.md §7.9, B1.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MoveFormModal } from '@/components/workspaces/MoveFormModal';

vi.mock('@/components/common/Toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const mockList = vi.fn();
vi.mock('@/services/workspaces', () => ({
  workspacesService: {
    list: (...args: unknown[]) => mockList(...args),
  },
}));

const mockMoveForm = vi.fn();
vi.mock('@/services/forms', () => ({
  formsService: {
    moveForm: (...args: unknown[]) => mockMoveForm(...args),
  },
}));

function renderModal(props: Partial<React.ComponentProps<typeof MoveFormModal>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const defaults = {
    isOpen: true,
    onClose: vi.fn(),
    formId: 'f1',
    formTitle: 'My Test Form',
  };
  return {
    onClose: defaults.onClose,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MoveFormModal {...defaults} {...props} />
      </QueryClientProvider>
    ),
  };
}

describe('MoveFormModal', () => {
  beforeEach(() => {
    mockList.mockReset();
    mockMoveForm.mockReset();
  });

  it('does not render when isOpen is false', () => {
    mockList.mockResolvedValue([]);
    renderModal({ isOpen: false });

    expect(screen.queryByText('Move My Test Form')).not.toBeInTheDocument();
  });

  it('renders with the form title in the heading', async () => {
    mockList.mockResolvedValue([]);
    renderModal();

    expect(await screen.findByText('Move My Test Form')).toBeInTheDocument();
  });

  it('shows a "personal" option when current context is a workspace', async () => {
    mockList.mockResolvedValue([
      { id: 'w1', name: 'Acme Inc', slug: 'acme', role: 'owner' },
    ]);
    renderModal({ currentContext: { type: 'workspace', workspaceId: 'w1' } });

    // Should offer "No workspace (personal)" because the form is currently in a workspace
    expect(await screen.findByRole('option', { name: /No workspace/ })).toBeInTheDocument();
  });

  it('excludes the current workspace from destination options', async () => {
    mockList.mockResolvedValue([
      { id: 'w1', name: 'Current WS', slug: 'current', role: 'owner' },
      { id: 'w2', name: 'Target WS', slug: 'target', role: 'member' },
    ]);
    renderModal({ currentContext: { type: 'workspace', workspaceId: 'w1' } });

    await screen.findByText('Move My Test Form');
    // Current workspace should NOT be listed as an option
    expect(screen.queryByRole('option', { name: /Current WS/ })).not.toBeInTheDocument();
    // Other workspace should be listed
    expect(screen.getByRole('option', { name: /Target WS/ })).toBeInTheDocument();
  });

  it('calls formsService.moveForm and closes on success', async () => {
    mockList.mockResolvedValue([
      { id: 'w2', name: 'Acme Inc', slug: 'acme', role: 'owner' },
    ]);
    mockMoveForm.mockResolvedValue({});
    const user = userEvent.setup();
    const { onClose } = renderModal({ currentContext: { type: 'personal' } });

    // Wait for modal to be populated
    await screen.findByText('Move My Test Form');

    await user.click(screen.getByRole('button', { name: /Move form/ }));

    await waitFor(() => expect(mockMoveForm).toHaveBeenCalledOnce());
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce());
  });

  it('keeps the modal open and does not close when the move fails', async () => {
    mockList.mockResolvedValue([
      { id: 'w2', name: 'Acme Inc', slug: 'acme', role: 'owner' },
    ]);
    mockMoveForm.mockRejectedValue(new Error('server error'));
    const user = userEvent.setup();
    const { onClose } = renderModal({ currentContext: { type: 'personal' } });

    await screen.findByText('Move My Test Form');
    await user.click(screen.getByRole('button', { name: /Move form/ }));

    await waitFor(() => expect(mockMoveForm).toHaveBeenCalledOnce());
    // Modal should still be open
    expect(screen.getByText('Move My Test Form')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Cancel without calling moveForm', async () => {
    mockList.mockResolvedValue([]);
    const user = userEvent.setup();
    const { onClose } = renderModal();

    await screen.findByText('Move My Test Form');
    await user.click(screen.getByRole('button', { name: /Cancel/ }));

    expect(mockMoveForm).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledOnce();
  });
});
