/**
 * __tests__/components/team/FormAccessPanel.test.tsx
 * Feature: sprint-9-team-permissions, requirements.md §7.8, design.md §21.
 * Design.md §21 names two cases explicitly: a workspace-form and a personal-form invocation —
 * the component takes only `formId`/`formTitle`, so both are exercised the same way here.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormAccessPanel } from '@/components/team/FormAccessPanel';
import type { FormAccessGrant } from '@/types/team';

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const mockListGrants = vi.fn();
const mockGrant = vi.fn();
const mockRevoke = vi.fn();
vi.mock('@/services/formAccess', () => ({
  formAccessService: {
    listGrants: (...args: unknown[]) => mockListGrants(...args),
    grant: (...args: unknown[]) => mockGrant(...args),
    revoke: (...args: unknown[]) => mockRevoke(...args),
  },
}));

const GRANT: FormAccessGrant = { userId: 'u1', email: 'sam@example.com', role: 'viewer', accessLevel: 'read' };

function renderPanel(props: Partial<React.ComponentProps<typeof FormAccessPanel>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <FormAccessPanel formId="f1" formTitle="Customer Survey" isOpen onClose={vi.fn()} {...props} />
    </QueryClientProvider>
  );
}

describe('FormAccessPanel', () => {
  beforeEach(() => {
    mockListGrants.mockReset();
    mockGrant.mockReset();
    mockRevoke.mockReset();
  });

  it.each([
    ['a workspace form', 'w-form-1'],
    ['a personal form', 'p-form-1'],
  ])('works identically for %s — fetches grants for that formId only', async (_label, formId) => {
    mockListGrants.mockResolvedValue([GRANT]);
    renderPanel({ formId });
    await screen.findByText('sam@example.com');
    expect(mockListGrants).toHaveBeenCalledWith(formId);
  });

  it('renders the modal title with the form title', async () => {
    mockListGrants.mockResolvedValue([]);
    renderPanel();
    expect(await screen.findByText('Share access to Customer Survey')).toBeInTheDocument();
  });

  it('shows the empty state when there are no existing grants', async () => {
    mockListGrants.mockResolvedValue([]);
    renderPanel();
    expect(await screen.findByText('No one else has access yet.')).toBeInTheDocument();
  });

  it('lists existing grants with email, role, and a revoke action', async () => {
    mockListGrants.mockResolvedValue([GRANT]);
    renderPanel();
    expect(await screen.findByText('sam@example.com')).toBeInTheDocument();
    expect(screen.getByText('Reviewer')).toBeInTheDocument();
    expect(screen.getByLabelText('Revoke access for sam@example.com')).toBeInTheDocument();
  });

  it('shows an error alert with retry when the grants query fails', async () => {
    mockListGrants.mockRejectedValue(new Error('network'));
    renderPanel();
    expect(await screen.findByText('Could not load existing access. Try again.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('submitting the form calls formAccessService.grant and resets the inputs without closing', async () => {
    mockListGrants.mockResolvedValue([]);
    mockGrant.mockResolvedValue(GRANT);
    const onClose = vi.fn();
    renderPanel({ onClose });

    await userEvent.type(await screen.findByLabelText('Email'), 'new@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Grant Access' }));

    await waitFor(() => expect(mockGrant).toHaveBeenCalledWith('f1', 'new@example.com', 'viewer'));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Email')).toHaveValue('');
  });

  it('asks before revoking a grant: nothing is sent until "Revoke access" is confirmed', async () => {
    mockListGrants.mockResolvedValue([GRANT]);
    mockRevoke.mockResolvedValue(undefined);
    renderPanel();

    await userEvent.click(await screen.findByLabelText('Revoke access for sam@example.com'));
    expect(screen.getByText('Revoke access for sam@example.com?')).toBeInTheDocument();
    expect(mockRevoke).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Revoke access' }));
    await waitFor(() => expect(mockRevoke).toHaveBeenCalledWith('f1', 'u1'));
  });

  it('"Keep access" cancels the revoke without sending anything', async () => {
    mockListGrants.mockResolvedValue([GRANT]);
    renderPanel();

    await userEvent.click(await screen.findByLabelText('Revoke access for sam@example.com'));
    await userEvent.click(screen.getByRole('button', { name: 'Keep access' }));
    expect(screen.queryByText('Revoke access for sam@example.com?')).not.toBeInTheDocument();
    expect(mockRevoke).not.toHaveBeenCalled();
  });

  it('describes the roles for this one form, not the workspace', async () => {
    mockListGrants.mockResolvedValue([]);
    renderPanel();
    await screen.findByLabelText('Email');
    expect(screen.getByRole('option', { name: /Admin — can manage this form/ })).toBeInTheDocument();
    expect(screen.queryByText(/full workspace access/)).not.toBeInTheDocument();
  });

  it('rejects an invalid email before submitting', async () => {
    mockListGrants.mockResolvedValue([]);
    renderPanel();

    await userEvent.type(await screen.findByLabelText('Email'), 'not-an-email');
    await userEvent.click(screen.getByRole('button', { name: 'Grant Access' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(mockGrant).not.toHaveBeenCalled();
  });
});
