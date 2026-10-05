/**
 * __tests__/components/settings/WorkspaceTab.test.tsx
 * Feature: sprint-6-settings
 * Tests: WorkspaceTab — renders name, save success/error, no-op guard, loading/error states
 * Requirements: 5.1-5.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetWorkspace = vi.fn();
const mockUpdateWorkspace = vi.fn();
vi.mock('@/services/settings', () => ({
  settingsService: {
    getWorkspace: (...args: unknown[]) => mockGetWorkspace(...args),
    updateWorkspace: (...args: unknown[]) => mockUpdateWorkspace(...args),
  },
}));

const mockToast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// WorkspaceTab now renders DangerZoneSection -> DeleteWorkspaceModal, which imports
// @/lib/firebase's real getAuth() — throws in this test env without a valid API key, even though
// these tests never open that modal. Same mock ChangePasswordModal.test.tsx/ProfileTab.test.tsx
// already use for the identical reason.
vi.mock('@/lib/firebase', () => ({ auth: {} }));
// DeleteWorkspaceModal also calls useAuth(), which needs a real AuthProvider context this test
// doesn't render — mocked the same way DeleteWorkspaceModal.test.tsx itself does. WorkspaceTab
// itself now also calls useAuth() for the orphaned-account "Log out" action.
const mockLogout = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ logout: mockLogout }) }));

import { WorkspaceTab } from '@/components/settings/WorkspaceTab';

function renderTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkspaceTab />
    </QueryClientProvider>
  );
}

describe('WorkspaceTab', () => {
  beforeEach(() => {
    mockGetWorkspace.mockReset();
    mockUpdateWorkspace.mockReset();
    mockToast.mockReset();
    mockLogout.mockReset();
  });

  it('renders the loaded workspace name', async () => {
    mockGetWorkspace.mockResolvedValue({ id: 'w1', name: 'Acme Workspace', logoUrl: null, branding: {}, createdAt: '' });
    renderTab();
    expect(await screen.findByDisplayValue('Acme Workspace')).toBeInTheDocument();
  });

  it('shows an inline error with retry when the workspace fails to load', async () => {
    mockGetWorkspace.mockRejectedValue(new Error('fail'));
    renderTab();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('disables Save while the name is unchanged', async () => {
    mockGetWorkspace.mockResolvedValue({ id: 'w1', name: 'Acme Workspace', logoUrl: null, branding: {}, createdAt: '' });
    renderTab();
    await screen.findByDisplayValue('Acme Workspace');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('saves a changed name and shows a success toast', async () => {
    mockGetWorkspace.mockResolvedValue({ id: 'w1', name: 'Acme Workspace', logoUrl: null, branding: {}, createdAt: '' });
    mockUpdateWorkspace.mockResolvedValue({ id: 'w1', name: 'New Name', logoUrl: null, branding: {}, createdAt: '' });
    renderTab();

    const nameInput = await screen.findByDisplayValue('Acme Workspace');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(mockUpdateWorkspace).toHaveBeenCalledWith({ name: 'New Name' }, undefined));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Workspace updated.', 'success'));
  });

  it('shows a failure toast when the save fails', async () => {
    mockGetWorkspace.mockResolvedValue({ id: 'w1', name: 'Acme Workspace', logoUrl: null, branding: {}, createdAt: '' });
    mockUpdateWorkspace.mockRejectedValue(new Error('network error'));
    renderTab();

    const nameInput = await screen.findByDisplayValue('Acme Workspace');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Failed to update workspace. Please try again.', 'error'));
  });

  it('shows an orphaned-account message with a Log out action on a 404 (workspace deleted, account still valid)', async () => {
    const notFound = Object.assign(new Error('not found'), {
      isAxiosError: true,
      response: { status: 404 },
    });
    mockGetWorkspace.mockRejectedValue(notFound);
    renderTab();

    expect(await screen.findByText(/no longer has an active workspace/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(mockLogout).toHaveBeenCalled();
  });

  it('shows the generic retry error (not the orphaned-account message) for a non-404 failure', async () => {
    mockGetWorkspace.mockRejectedValue(new Error('network error'));
    renderTab();

    expect(await screen.findByText('Unable to load your workspace.')).toBeInTheDocument();
    expect(screen.queryByText(/no longer has an active workspace/)).not.toBeInTheDocument();
  });
});
