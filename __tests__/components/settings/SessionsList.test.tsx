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
vi.mock('@/services/settings', () => ({
  settingsService: {
    getSessions: (...args: unknown[]) => mockGetSessions(...args),
    revokeSession: (...args: unknown[]) => mockRevokeSession(...args),
  },
}));

const mockToast = vi.fn();
vi.mock('@/components/common/Toast', () => ({
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
    mockToast.mockReset();
  });

  it('shows loading skeletons while sessions are in flight', () => {
    mockGetSessions.mockReturnValue(new Promise(() => {}));
    const { container } = renderList();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders every session and never shows Revoke on the current one', async () => {
    mockGetSessions.mockResolvedValue({ sessions: SESSIONS });
    renderList();

    expect(await screen.findByText('Chrome on Windows')).toBeInTheDocument();
    expect(screen.getByText('Safari on iPhone')).toBeInTheDocument();
    expect(screen.getByText('This device')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Revoke session on/ })).toHaveLength(1);
    expect(screen.queryByRole('button', { name: 'Revoke session on Chrome on Windows' })).not.toBeInTheDocument();
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
});
