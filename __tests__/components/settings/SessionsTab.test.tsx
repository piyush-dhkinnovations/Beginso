/**
 * __tests__/components/settings/SessionsTab.test.tsx
 * sprint-10-events-migration, tasks.md 5.1 — requirements.md §7.12. A relocation: SessionsList's
 * own behaviour is covered by SessionsList.test.tsx and is deliberately not re-tested here.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetSessions = vi.fn();
vi.mock('@/services/settings', () => ({
  settingsService: {
    getSessions: (...args: unknown[]) => mockGetSessions(...args),
    revokeSession: vi.fn(),
  },
}));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

import { SessionsTab } from '@/components/settings/SessionsTab';

const CURRENT = {
  id: 's1',
  deviceLabel: 'Chrome on Windows',
  approxLocation: { city: 'Mumbai', country: 'India' },
  lastActiveAt: '2026-08-17T08:30:00.000Z',
  isCurrent: true,
};
const OTHER = { ...CURRENT, id: 's2', deviceLabel: 'Safari on iPhone', isCurrent: false };

function renderTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SessionsTab />
    </QueryClientProvider>
  );
}

describe('SessionsTab', () => {
  beforeEach(() => {
    mockGetSessions.mockReset();
  });

  it('renders its heading and the relocated SessionsList', async () => {
    mockGetSessions.mockResolvedValue({ sessions: [CURRENT, OTHER] });
    renderTab();

    expect(screen.getByRole('heading', { name: 'Sessions & Devices' })).toBeInTheDocument();
    expect(await screen.findByText('Safari on iPhone')).toBeInTheDocument();
  });

  it('keeps the current device non-revocable (Correctness Property 5) after the move', async () => {
    mockGetSessions.mockResolvedValue({ sessions: [CURRENT, OTHER] });
    renderTab();
    await screen.findByText('Chrome on Windows');

    // SessionRow keeps the button in the DOM (so rows share a height) but hides it from the tab order.
    expect(screen.getByRole('button', { name: 'Revoke session on Chrome on Windows' })).toHaveAttribute('tabIndex', '-1');
    expect(screen.getByRole('button', { name: 'Revoke session on Chrome on Windows' })).toHaveClass('invisible');
    expect(screen.getByRole('button', { name: 'Revoke session on Safari on iPhone' })).not.toHaveAttribute('tabIndex');
  });

  it('shows the list error state with a retry', async () => {
    mockGetSessions.mockRejectedValue(new Error('fail'));
    renderTab();

    expect(await screen.findByText('Unable to load your sessions.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('carries no hardcoded neutral/white colour classes (themed tokens only)', async () => {
    mockGetSessions.mockResolvedValue({ sessions: [CURRENT, OTHER] });
    const { container } = renderTab();
    await screen.findByText('Safari on iPhone');

    expect(container.innerHTML).not.toMatch(/neutral-\d|bg-white/);
  });
});
