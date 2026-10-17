import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockSend = vi.fn();
vi.mock('@/services/invitations', () => ({ invitationsService: { send: (...a: unknown[]) => mockSend(...a) } }));
const mockToast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: mockToast }) }));

import { InviteMembersModal } from '@/components/team/InviteMembersModal';

function renderModal(over: Partial<React.ComponentProps<typeof InviteMembersModal>> = {}, watchInvalidation = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = watchInvalidation ? vi.spyOn(client, 'invalidateQueries') : undefined;
  const utils = render(
    <QueryClientProvider client={client}>
      <InviteMembersModal workspaceId="acme" isOpen onClose={vi.fn()} existingEmails={['me@x.com', 'Sam@X.com']} {...over} />
    </QueryClientProvider>
  );
  return { invalidate, ...utils };
}

describe('InviteMembersModal', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it('refuses an address that is already a member on the spot: inline under the field, nothing sent (QA A9-003)', async () => {
    renderModal();
    await userEvent.type(screen.getByLabelText('Email Addresses'), 'sam@x.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send Invites' }));
    expect(await screen.findByText('sam@x.com is already a member of this workspace.')).toBeInTheDocument();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('shows a failed send inline too, and clears it once the person edits the field', async () => {
    mockSend.mockRejectedValue(new Error('network down'));
    renderModal({ existingEmails: [] });
    await userEvent.type(screen.getByLabelText('Email Addresses'), 'new@x.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send Invites' }));
    expect(await screen.findByText(/Invitations were not sent/)).toBeInTheDocument();
    expect(mockToast).not.toHaveBeenCalled(); // inline, not a toast that stacks up later
    await userEvent.type(screen.getByLabelText('Email Addresses'), 'x');
    await waitFor(() => expect(screen.queryByText(/Invitations were not sent/)).not.toBeInTheDocument());
  });

  it('after a successful send it refreshes the pending-invitations list (QA A9-002)', async () => {
    mockSend.mockResolvedValue(undefined);
    const { invalidate } = renderModal({ existingEmails: [] }, true);
    await userEvent.type(screen.getByLabelText('Email Addresses'), 'new@x.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send Invites' }));
    await waitFor(() => expect(mockSend).toHaveBeenCalledWith('acme', ['new@x.com'], 'member'));
    await waitFor(() => expect(invalidate!).toHaveBeenCalledWith({ queryKey: expect.arrayContaining(['invitations']) }));
  });
});
