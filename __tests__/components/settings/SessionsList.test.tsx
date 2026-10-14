/**
 * __tests__/components/settings/SessionsList.test.tsx
 * Feature: sprint-6-settings
 * Tests: SessionsList — renders rows, current session never shows Revoke, empty-beyond-current
 * message, revoke removes the row after confirmation, loading/error states
 * Requirements: 9.1-9.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetSessions = vi.fn();
const mockRevokeSession = vi.fn();
const mockRevokeOthers = vi.fn();
vi.mock('@/services/settings', () => ({
  settingsService: {
    getSessions: (...args: unknown[]) => mockGetSessions(...args),
    revokeSession: (...args: unknown[]) => mockRevokeSession(...args),
    revokeOtherSessions: (...args: unknown[]) => mockRevokeOthers(...args),
  },
}));

const mockToast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

import { SessionsList } from '@/components/settings/SessionsList';

const SESSIONS = [
  { id: 's1', deviceLabel: 'Chrome on Windows', approxLocation: { city: 'Mumbai', country: 'India' }, lastActiveAt: '2026-08-17T08:30:00.000Z', isCurrent: true },
  { id: 's2', deviceLabel: 'Safari on iPhone', approxLocation: { city: 'Mumbai', country: 'India' }, lastActiveAt: '2026-08-16T19:12:00.000Z', isCurrent: false },
];

function renderList() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SessionsList />
    </QueryClientProvider>
  );
}

describe('SessionsList', () => {
  beforeEach(() => {
    mockGetSessions.mockReset();
    mockRevokeSession.mockReset();
    mockRevokeOthers.mockReset();
    mockToast.mockReset();
  });

  it('shows loading skeletons while sessions are in flight', () => {
    mockGetSessions.mockReturnValue(new Promise(() => {}));
    const { container } = renderList();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders every session and never shows a working Revoke on the current one', async () => {
    mockGetSessions.mockResolvedValue({ sessions: SESSIONS });
    renderList();

    expect(await screen.findByText('Chrome on Windows')).toBeInTheDocument();
    expect(screen.getByText('Safari on iPhone')).toBeInTheDocument();
    expect(screen.getByText('This device')).toBeInTheDocument();
    // SessionRow always renders the button (so every row reserves the same height), hiding it for
    // the current session via `invisible` + `tabIndex={-1}` rather than omitting it from the DOM —
    // both exist, but only the non-current one is a real, focusable/interactive control.
    expect(screen.getAllByRole('button', { name: /Revoke session on/ })).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Revoke session on Chrome on Windows' })).toHaveAttribute('tabIndex', '-1');
    expect(screen.getByRole('button', { name: 'Revoke session on Safari on iPhone' })).not.toHaveAttribute('tabIndex');
  });

  it('shows "No other active sessions." when only the current session exists', async () => {
    mockGetSessions.mockResolvedValue({ sessions: [SESSIONS[0]] });
    renderList();

    expect(await screen.findByText('No other active sessions.')).toBeInTheDocument();
  });

  it('shows an inline error with retry when sessions fail to load', async () => {
    mockGetSessions.mockRejectedValue(new Error('fail'));
    renderList();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  it('revokes a session after confirming, removing the row and showing a toast', async () => {
    mockGetSessions.mockResolvedValue({ sessions: SESSIONS });
    mockRevokeSession.mockResolvedValue(undefined);
    renderList();

    fireEvent.click(await screen.findByRole('button', { name: 'Revoke session on Safari on iPhone' }));
    expect(screen.getByText('Revoke this session?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Revoke session' }));

    await waitFor(() => expect(mockRevokeSession).toHaveBeenCalledWith('s2'));
    await waitFor(() => expect(screen.queryByText('Safari on iPhone')).not.toBeInTheDocument());
    expect(mockToast).toHaveBeenCalledWith('Session revoked.', 'success');
  });

  it('does not revoke when the confirm modal is cancelled', async () => {
    mockGetSessions.mockResolvedValue({ sessions: SESSIONS });
    renderList();

    fireEvent.click(await screen.findByRole('button', { name: 'Revoke session on Safari on iPhone' }));
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(mockRevokeSession).not.toHaveBeenCalled();
    expect(screen.getByText('Safari on iPhone')).toBeInTheDocument();
  });

  describe('sign out of all other devices', () => {
    it('signs out the other devices after confirmation and leaves only this one', async () => {
      mockGetSessions.mockResolvedValue({ sessions: SESSIONS });
      mockRevokeOthers.mockResolvedValue({ revoked: 1 });
      renderList();
      await screen.findByText('Safari on iPhone');

      fireEvent.click(screen.getByRole('button', { name: 'Sign out of all other devices' }));
      expect(mockRevokeOthers).not.toHaveBeenCalled(); // asks first
      // After the call the server lists the other session as revoked (the list is refetched).
      mockGetSessions.mockResolvedValue({ sessions: [SESSIONS[0], { ...SESSIONS[1], revokedAt: '2026-08-17T09:00:00.000Z' }] });
      fireEvent.click(screen.getByRole('button', { name: 'Sign out other devices' }));

      await waitFor(() => expect(mockRevokeOthers).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(screen.queryByText('Safari on iPhone')).not.toBeInTheDocument());
      expect(screen.getByText('Chrome on Windows')).toBeInTheDocument();
      expect(mockToast).toHaveBeenCalledWith('Signed out of 1 other device.', 'success');
    });

    it('is disabled when this is the only active session', async () => {
      mockGetSessions.mockResolvedValue({ sessions: [SESSIONS[0]] });
      renderList();
      await screen.findByText('Chrome on Windows');
      expect(screen.getByRole('button', { name: 'Sign out of all other devices' })).toBeDisabled();
    });

    it('cancelling the confirmation does nothing', async () => {
      mockGetSessions.mockResolvedValue({ sessions: SESSIONS });
      renderList();
      await screen.findByText('Safari on iPhone');
      fireEvent.click(screen.getByRole('button', { name: 'Sign out of all other devices' }));
      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(mockRevokeOthers).not.toHaveBeenCalled();
    });

    it('reports a failure and keeps the list', async () => {
      mockGetSessions.mockResolvedValue({ sessions: SESSIONS });
      mockRevokeOthers.mockRejectedValue(new Error('500'));
      renderList();
      await screen.findByText('Safari on iPhone');
      fireEvent.click(screen.getByRole('button', { name: 'Sign out of all other devices' }));
      fireEvent.click(screen.getByRole('button', { name: 'Sign out other devices' }));
      await waitFor(() => expect(mockToast).toHaveBeenCalledWith(expect.any(String), 'error'));
      expect(screen.getByText('Safari on iPhone')).toBeInTheDocument();
    });
  });

  it('hides sessions that were already signed out', async () => {
    mockGetSessions.mockResolvedValue({
      sessions: [...SESSIONS, { id: 's3', deviceLabel: 'Old Firefox', approxLocation: null, lastActiveAt: '2026-08-01T00:00:00.000Z', isCurrent: false, revokedAt: '2026-08-02T00:00:00.000Z' }],
    });
    renderList();
    await screen.findByText('Safari on iPhone');
    expect(screen.queryByText('Old Firefox')).not.toBeInTheDocument();
  });
});
