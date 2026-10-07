/**
 * __tests__/components/settings/SecurityTab.test.tsx
 * Feature: sprint-6-settings
 * Tests: SecurityTab — verification badge variant mapping, account dates, error state (sessions
 * moved to SessionsTab in sprint-10)
 * Requirements: 8.1-8.3, 9.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetProfile = vi.fn();
const mockGetSessions = vi.fn();
vi.mock('@/services/settings', () => ({
  settingsService: {
    getProfile: (...args: unknown[]) => mockGetProfile(...args),
    getSessions: (...args: unknown[]) => mockGetSessions(...args),
    revokeSession: vi.fn(),
  },
}));

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// ChangePasswordModal needs a live Firebase auth object; not under test here.
vi.mock('@/lib/firebase', () => ({ auth: {} }));

import { SecurityTab } from '@/components/settings/SecurityTab';

function mockProfile(overrides: Partial<{ emailVerified: boolean }> = {}) {
  return {
    id: 'u1',
    name: 'Jordan Rivera',
    email: 'jordan@example.com',
    avatarUrl: null,
    role: 'admin',
    status: 'active',
    emailVerified: true,
    createdAt: '2026-06-01T09:00:00.000Z',
    lastLoginAt: '2026-08-17T08:30:00.000Z',
    ...overrides,
  };
}

function renderTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SecurityTab />
    </QueryClientProvider>
  );
}

describe('SecurityTab', () => {
  beforeEach(() => {
    mockGetProfile.mockReset();
    mockGetSessions.mockReset();
  });

  it('shows the "active" verified badge when emailVerified is true', async () => {
    mockGetProfile.mockResolvedValue(mockProfile({ emailVerified: true }));
    mockGetSessions.mockResolvedValue({ sessions: [] });
    renderTab();

    expect(await screen.findByText('Email verified')).toBeInTheDocument();
  });

  it('shows the "draft" unverified badge when emailVerified is false', async () => {
    mockGetProfile.mockResolvedValue(mockProfile({ emailVerified: false }));
    mockGetSessions.mockResolvedValue({ sessions: [] });
    renderTab();

    expect(await screen.findByText('Email not verified')).toBeInTheDocument();
  });

  it('renders account created and last login dates', async () => {
    mockGetProfile.mockResolvedValue(mockProfile());
    mockGetSessions.mockResolvedValue({ sessions: [] });
    renderTab();

    expect(await screen.findByText(/Account created/)).toBeInTheDocument();
    expect(screen.getByText(/Last login/)).toBeInTheDocument();
  });

  // sprint-10 requirements.md §7.12 — sessions moved to their own tab, so SecurityTab neither
  // fetches nor renders them any more (its old partial-failure tests for that no longer apply).
  it('no longer renders or fetches the sessions list', async () => {
    mockGetProfile.mockResolvedValue(mockProfile());
    renderTab();

    expect(await screen.findByText('Email verified')).toBeInTheDocument();
    expect(screen.queryByText('Active sessions')).not.toBeInTheDocument();
    expect(mockGetSessions).not.toHaveBeenCalled();
  });

  it('shows a retryable error when the profile fails to load', async () => {
    mockGetProfile.mockRejectedValue(new Error('fail'));
    renderTab();

    expect(await screen.findByText('Unable to load your security details.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('carries no hardcoded neutral/white colour classes (themed tokens only)', async () => {
    mockGetProfile.mockResolvedValue(mockProfile());
    const { container } = renderTab();
    await screen.findByText('Email verified');

    expect(container.innerHTML).not.toMatch(/neutral-\d|bg-white/);
  });
});
