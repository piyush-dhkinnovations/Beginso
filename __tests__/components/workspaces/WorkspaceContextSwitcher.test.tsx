/**
 * __tests__/components/workspaces/WorkspaceContextSwitcher.test.tsx
 * Feature: sprint-8-workspaces-context, requirements.md §7.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WorkspaceContextSwitcher } from '@/components/workspaces/WorkspaceContextSwitcher';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockList = vi.fn();
vi.mock('@/services/workspaces', () => ({
  workspacesService: {
    list: (...args: unknown[]) => mockList(...args),
  },
}));

function renderSwitcher(props: { currentLabel?: string } = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkspaceContextSwitcher {...props} />
    </QueryClientProvider>
  );
}

describe('WorkspaceContextSwitcher', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockList.mockReset();
  });

  it('fetches the workspace list and lists it in the dropdown', async () => {
    mockList.mockResolvedValue([{ id: 'w1', name: 'Acme Inc', slug: 'acme', role: 'owner' }]);
    renderSwitcher({ currentLabel: 'Personal' });

    await waitFor(() => expect(mockList).toHaveBeenCalled());
    await userEvent.setup().click(screen.getByRole('button', { name: /Switch context/ }));

    expect(screen.getByRole('menuitem', { name: /Acme Inc/ })).toBeInTheDocument();
  });

  it('navigates to /dashboard when Personal is chosen', async () => {
    mockList.mockResolvedValue([]);
    const user = userEvent.setup();
    renderSwitcher();

    await waitFor(() => expect(mockList).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /Switch context/ }));
    await user.click(screen.getByRole('menuitem', { name: /Personal/ }));

    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('navigates to /w/:slug when a workspace is chosen', async () => {
    mockList.mockResolvedValue([{ id: 'w1', name: 'Acme Inc', slug: 'acme', role: 'owner' }]);
    const user = userEvent.setup();
    renderSwitcher();

    await waitFor(() => expect(mockList).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: /Switch context/ }));
    await user.click(screen.getByRole('menuitem', { name: /Acme Inc/ }));

    expect(mockPush).toHaveBeenCalledWith('/w/acme');
  });
});
