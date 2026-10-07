/**
 * __tests__/components/settings/NotificationsTab.test.tsx
 * Feature: sprint-6-settings
 * Tests: NotificationsTab — 3 toggles render, immediate save, skeleton on load, failure rollback
 * Requirements: 7.1-7.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { render, screen, waitFor } from '@testing-library/react';
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

import { NotificationsTab } from '@/components/settings/NotificationsTab';

function mockWorkspace(overrides: Partial<{ newResponseEmail: boolean; weeklyDigestEmail: boolean; productUpdatesEmail: boolean }> = {}) {
  return {
    id: 'w1',
    name: 'Acme',
    logoUrl: null,
    branding: {},
    notificationPreferences: {
      newResponseEmail: true,
      weeklyDigestEmail: true,
      productUpdatesEmail: false,
      ...overrides,
    },
    createdAt: '',
  };
}

function renderTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NotificationsTab />
    </QueryClientProvider>
  );
}

describe('NotificationsTab', () => {
  beforeEach(() => {
    mockGetWorkspace.mockReset();
    mockUpdateWorkspace.mockReset();
    mockToast.mockReset();
  });

  it('shows a loading skeleton while the workspace query is in flight', () => {
    mockGetWorkspace.mockReturnValue(new Promise(() => {}));
    const { container } = renderTab();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders all 3 toggle rows with their current state', async () => {
    mockGetWorkspace.mockResolvedValue(mockWorkspace());
    renderTab();

    const switches = await screen.findAllByRole('switch');
    expect(switches).toHaveLength(3);
    expect(switches[0]).toHaveAttribute('aria-checked', 'true');
    expect(switches[2]).toHaveAttribute('aria-checked', 'false');
  });

  it('saves immediately on toggle, no separate Save button', async () => {
    mockGetWorkspace.mockResolvedValue(mockWorkspace());
    mockUpdateWorkspace.mockResolvedValue(mockWorkspace({ productUpdatesEmail: true }));
    renderTab();

    const switches = await screen.findAllByRole('switch');
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument();

    switches[2].click();

    await waitFor(() =>
      expect(mockUpdateWorkspace).toHaveBeenCalledWith({ notificationPreferences: { productUpdatesEmail: true } })
    );
  });

  it('rolls back to the prior state and toasts on a failed save', async () => {
    mockGetWorkspace.mockResolvedValue(mockWorkspace({ newResponseEmail: true }));
    mockUpdateWorkspace.mockRejectedValue(new Error('network error'));
    renderTab();

    const switches = await screen.findAllByRole('switch');
    expect(switches[0]).toHaveAttribute('aria-checked', 'true');

    switches[0].click();

    // The optimistic flip-to-false is too transient to reliably poll for (the mocked rejection
    // settles almost immediately) — instead verify the mutation attempted the correct flip, that
    // the error path fired, and that the settled state matches the pre-flip server value exactly.
    await waitFor(() =>
      expect(mockUpdateWorkspace).toHaveBeenCalledWith({ notificationPreferences: { newResponseEmail: false } })
    );
    await waitFor(() => expect(switches[0]).toHaveAttribute('aria-checked', 'true'));
    expect(mockToast).toHaveBeenCalledWith('"Email me when a form receives a new response" was not saved. Please try again.', 'error');
  });

  it('shows an inline error with retry when preferences fail to load', async () => {
    mockGetWorkspace.mockRejectedValue(new Error('fail'));
    renderTab();
    expect(await screen.findByRole('alert')).toBeInTheDocument();
  });

  // sprint-11-v2a-hardening 1.4 — token pass regression: no raw neutral/white/brand class left in source.
  it('has no raw bg-white/neutral/gray/brand class in its source', () => {
    const source = readFileSync(join(__dirname, '../../../src/components/settings/NotificationsTab.tsx'), 'utf-8');
    expect(source).not.toMatch(/bg-white|text-neutral-|bg-neutral-|border-neutral-|text-gray-|bg-gray-|text-black|border-t-brand-/);
  });
});
