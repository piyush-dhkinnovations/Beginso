/**
 * __tests__/components/settings/SecurityTab.test.tsx
 * Feature: sprint-6-settings
 * Tests: SecurityTab — verification badge variant mapping, account dates, partial-failure
 * tolerance (a sessions-load failure doesn't blank the verification/dates section, and vice versa)
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

vi.mock('@/components/common/Toast', () => ({
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

  it('still shows the verification badge and dates when the sessions list fails to load', async () => {
    mockGetProfile.mockResolvedValue(mockProfile());
    mockGetSessions.mockRejectedValue(new Error('fail'));
    renderTab();

    expect(await screen.findByText('Email verified')).toBeInTheDocument();
    expect(screen.getByText('Unable to load your sessions.')).toBeInTheDocument();
  });

  it('still shows the sessions list when the profile fails to load', async () => {
    mockGetProfile.mockRejectedValue(new Error('fail'));
    mockGetSessions.mockResolvedValue({
      sessions: [{ id: 's1', deviceLabel: 'Chrome on Windows', approxLocation: { city: 'Mumbai', country: 'India' }, lastActiveAt: '2026-08-17T08:30:00.000Z', isCurrent: true }],
    });
    renderTab();

    expect(await screen.findByText('Unable to load your security details.')).toBeInTheDocument();
    expect(await screen.findByText('Chrome on Windows')).toBeInTheDocument();
  });
});
