/**
 * __tests__/app/(user)/shared/page.test.tsx
 * Feature: sprint-9-team-permissions, requirements.md §7.9, §12, design.md §21.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SharedWithMePage from '@/app/(user)/shared/page';
import type { SharedFormItem } from '@/types/team';

// The row menu navigates with useRouter (needs a mounted app router outside Next).
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

// Unmocked services (tags, members, workspaces, notifications...) would hit the real axios
// instance, whose 401 interceptor fetches a relative logout URL (invalid under jsdom/node).
vi.mock('@/lib/axios', () => {
  const ok = () => Promise.resolve({ data: [] });
  return { default: { get: ok, post: ok, put: ok, patch: ok, delete: ok } };
});

const mockList = vi.fn();
vi.mock('@/services/shared', () => ({
  sharedService: { list: (...args: unknown[]) => mockList(...args) },
}));

const SHARE: SharedFormItem = {
  id: 'f1',
  title: 'Customer Survey',
  sharedByName: 'Priya Shah',
  workspaceName: 'Acme Inc',
  role: 'viewer',
  accessLevel: 'read',
  sharedAt: '2026-09-10T00:00:00.000Z',
};

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SharedWithMePage />
    </QueryClientProvider>
  );
}

describe('SharedWithMePage (/shared)', () => {
  beforeEach(() => {
    mockList.mockReset();
  });

  it('renders the page heading', async () => {
    mockList.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('Shared with me')).toBeInTheDocument();
  });

  it('shows the empty state when nothing has been shared', async () => {
    mockList.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('Nothing shared with you yet.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Back to Home' })).toBeInTheDocument();
  });

  it('renders a populated card grid', async () => {
    mockList.mockResolvedValue([SHARE]);
    renderPage();
    expect(await screen.findByText('Customer Survey')).toBeInTheDocument();
  });

  it('shows a generic error state with retry on a non-403 failure', async () => {
    mockList.mockRejectedValue({ response: { status: 500 } });
    renderPage();
    expect(await screen.findByText('Something went wrong.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows a permission-denied state with no retry on a 403', async () => {
    mockList.mockRejectedValue({ response: { status: 403 } });
    renderPage();
    expect(await screen.findByText('You do not have access.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('retrying refetches the list', async () => {
    mockList.mockRejectedValueOnce({ response: { status: 500 } }).mockResolvedValueOnce([SHARE]);
    renderPage();
    const retryButton = await screen.findByRole('button', { name: 'Retry' });
    await userEvent.click(retryButton);
    await waitFor(() => expect(screen.getByText('Customer Survey')).toBeInTheDocument());
  });
});
