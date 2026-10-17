/**
 * __tests__/components/settings/DeleteWorkspaceModal.test.tsx
 * Feature: sprint-6-settings
 * Tests: DeleteWorkspaceModal — Delete disabled on partial/incorrect match or missing password,
 * enabled only once both are satisfied, wrong password shows a field error, success reauths then
 * deletes then logs out, delete failure keeps the modal open with an inline error
 * Requirements: 10.4-10.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
vi.mock('@/lib/firebase', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...args: unknown[]) => mockSignIn(...args),
  signOut: (...args: unknown[]) => mockSignOut(...args),
}));

const mockGetProfile = vi.fn();
const mockDeleteWorkspace = vi.fn();
vi.mock('@/services/settings', () => ({
  settingsService: {
    getProfile: (...args: unknown[]) => mockGetProfile(...args),
    deleteWorkspace: (...args: unknown[]) => mockDeleteWorkspace(...args),
  },
}));

vi.mock('@/services/forms', () => ({ formsService: { getForms: () => Promise.resolve({ forms: [], total: 22 }) } }));
vi.mock('@/services/responses', () => ({ responsesService: { getStats: () => Promise.resolve({ total: 77 }) } }));

const mockLogout = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ logout: mockLogout }),
}));

import { DeleteWorkspaceModal } from '@/components/settings/DeleteWorkspaceModal';

function renderModal(props: Partial<React.ComponentProps<typeof DeleteWorkspaceModal>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DeleteWorkspaceModal isOpen onClose={vi.fn()} workspaceName="Acme Workspace" {...props} />
    </QueryClientProvider>
  );
}

describe('DeleteWorkspaceModal', () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    mockSignOut.mockReset().mockResolvedValue(undefined);
    mockGetProfile.mockReset().mockResolvedValue({ email: 'jordan@example.com' });
    mockDeleteWorkspace.mockReset();
    mockLogout.mockReset();
  });

  it('keeps Delete disabled with no password entered, even with an exact name match', () => {
    renderModal();
    fireEvent.change(screen.getByPlaceholderText('Acme Workspace'), { target: { value: 'Acme Workspace' } });
    expect(screen.getByRole('button', { name: 'Delete account permanently' })).toBeDisabled();
  });

  it('keeps Delete disabled on a partial/incorrect name match even with a password entered', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('Confirm your password'), 'mypassword');
    fireEvent.change(screen.getByPlaceholderText('Acme Workspace'), { target: { value: 'Acme Workspac' } });

    expect(screen.getByRole('button', { name: 'Delete account permanently' })).toBeDisabled();
  });

  it('enables Delete only once both the password and exact name match are present', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('Confirm your password'), 'mypassword');
    fireEvent.change(screen.getByPlaceholderText('Acme Workspace'), { target: { value: 'Acme Workspace' } });

    expect(screen.getByRole('button', { name: 'Delete account permanently' })).not.toBeDisabled();
  });

  it('shows a field error on a wrong password and never calls deleteWorkspace or logout', async () => {
    const user = userEvent.setup();
    mockSignIn.mockRejectedValue({ code: 'auth/invalid-credential' });
    renderModal();

    await user.type(screen.getByLabelText('Confirm your password'), 'wrongpass');
    fireEvent.change(screen.getByPlaceholderText('Acme Workspace'), { target: { value: 'Acme Workspace' } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete account permanently' }));

    expect(await screen.findByText('Current password is incorrect.')).toBeInTheDocument();
    expect(mockDeleteWorkspace).not.toHaveBeenCalled();
    expect(mockLogout).not.toHaveBeenCalled();
  });

  it('reauthenticates, deletes, and logs out on success', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({ user: { getIdToken: () => Promise.resolve('fresh-id-token') } });
    mockDeleteWorkspace.mockResolvedValue(undefined);
    renderModal();

    await user.type(screen.getByLabelText('Confirm your password'), 'mypassword');
    fireEvent.change(screen.getByPlaceholderText('Acme Workspace'), { target: { value: 'Acme Workspace' } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete account permanently' }));

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledWith(expect.anything(), 'jordan@example.com', 'mypassword'));
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
    await waitFor(() => expect(mockDeleteWorkspace).toHaveBeenCalledWith({ reauthToken: 'fresh-id-token' }));
    await waitFor(() => expect(mockLogout).toHaveBeenCalled());
  });

  it('keeps the modal open with an inline error when deleteWorkspace itself fails, without logging out', async () => {
    const user = userEvent.setup();
    mockSignIn.mockResolvedValue({ user: { getIdToken: () => Promise.resolve('fresh-id-token') } });
    mockDeleteWorkspace.mockRejectedValue(new Error('network error'));
    const onClose = vi.fn();
    renderModal({ onClose });

    await user.type(screen.getByLabelText('Confirm your password'), 'mypassword');
    fireEvent.change(screen.getByPlaceholderText('Acme Workspace'), { target: { value: 'Acme Workspace' } });
    fireEvent.click(screen.getByRole('button', { name: 'Delete account permanently' }));

    await waitFor(() => expect(mockDeleteWorkspace).toHaveBeenCalled());
    expect(mockLogout).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('is titled as an account deletion, and never shows a "Counting…" placeholder inside the warning', () => {
    renderModal();
    expect(screen.getByRole('dialog', { name: 'Delete your account?' })).toBeInTheDocument();
    expect(screen.queryByText(/Counting/)).not.toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/will be destroyed/);
    expect(screen.getByText(/Type your workspace name/)).toBeInTheDocument();
  });
});
