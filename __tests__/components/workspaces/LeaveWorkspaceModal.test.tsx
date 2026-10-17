import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
const mockToast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: mockToast }) }));
const mockLeave = vi.fn();
vi.mock('@/services/team', () => ({ teamService: { leave: (...a: unknown[]) => mockLeave(...a) } }));

import { LeaveWorkspaceModal } from '@/components/workspaces/LeaveWorkspaceModal';

function renderModal(workspace: { slug: string; name: string } | null, onClose = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LeaveWorkspaceModal workspace={workspace} onClose={onClose} />
    </QueryClientProvider>
  );
  return onClose;
}

describe('LeaveWorkspaceModal', () => {
  beforeEach(() => {
    mockLeave.mockReset();
    mockPush.mockReset();
    mockToast.mockReset();
  });

  it('renders nothing without a workspace', () => {
    renderModal(null);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('asks first, names the workspace, and only leaves on confirm', async () => {
    mockLeave.mockResolvedValue(undefined);
    const onClose = renderModal({ slug: 'acme', name: 'Acme Inc' });
    expect(screen.getByRole('dialog', { name: 'Leave Acme Inc?' })).toBeInTheDocument();
    expect(mockLeave).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Leave workspace' }));
    await waitFor(() => expect(mockLeave).toHaveBeenCalledWith('acme'));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/workspaces'));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows the server reason when it refuses (the only owner cannot leave)', async () => {
    mockLeave.mockRejectedValue({ response: { status: 400, data: { error: { code: 'LAST_OWNER', message: 'Transfer ownership before leaving.' } } } });
    renderModal({ slug: 'acme', name: 'Acme Inc' });
    await userEvent.click(screen.getByRole('button', { name: 'Leave workspace' }));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.any(String), 'error'));
    expect(mockPush).not.toHaveBeenCalled();
  });
});
