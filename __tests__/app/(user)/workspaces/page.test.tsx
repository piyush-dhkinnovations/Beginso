/**
 * __tests__/app/(user)/workspaces/page.test.tsx
 * Feature: sprint-8-workspaces-context, requirements.md §7.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WorkspacesPage from '@/app/(user)/workspaces/page';

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

const mockLeave = vi.fn();
vi.mock('@/services/team', () => ({ teamService: { leave: (...a: unknown[]) => mockLeave(...a) } }));

const mockList = vi.fn();
const mockCreate = vi.fn();
vi.mock('@/services/workspaces', () => ({
  workspacesService: {
    list: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
  },
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <WorkspacesPage />
    </QueryClientProvider>
  );
}

describe('WorkspacesPage', () => {
  beforeEach(() => {
    mockList.mockReset();
    mockCreate.mockReset();
  });

  it('shows a single "Create workspace" empty state when there are none', async () => {
    mockList.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText('Create your first workspace')).toBeInTheDocument();
  });

  it('lists every workspace with its role, rendered through ROLE_LABELS not the raw wire value', async () => {
    mockList.mockResolvedValue([
      { id: 'w1', name: 'Acme Inc', slug: 'acme', role: 'owner', memberCount: 3 },
      { id: 'w2', name: 'Beta Co', slug: 'beta', role: 'member', memberCount: 1 },
    ]);
    renderPage();

    expect(await screen.findByText('Acme Inc')).toBeInTheDocument();
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Beta Co')).toBeInTheDocument();
    expect(screen.getByText('Editor')).toBeInTheDocument();
    expect(screen.queryByText('member')).not.toBeInTheDocument();
  });

  it('each card navigates to /w/:slug', async () => {
    mockList.mockResolvedValue([{ id: 'w1', name: 'Acme Inc', slug: 'acme', role: 'owner' }]);
    renderPage();

    const link = await screen.findByRole('link', { name: /Acme Inc/ });
    expect(link).toHaveAttribute('href', '/w/acme');
  });

  it('offers Leave to an Editor (not only people who can manage the team) and leaves after confirmation (QA A9-007)', async () => {
    mockLeave.mockReset();
    mockLeave.mockResolvedValue(undefined);
    mockList.mockResolvedValue([{ id: 'w1', name: 'Acme Inc', slug: 'acme', role: 'member' }]);
    renderPage();

    expect(await screen.findByText('Editor')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Leave Acme Inc' }));
    expect(mockLeave).not.toHaveBeenCalled();
    await userEvent.click(await screen.findByRole('button', { name: 'Leave workspace' }));
    await waitFor(() => expect(mockLeave).toHaveBeenCalledWith('acme'));
  });

  it('shows an error state with retry on failure', async () => {
    mockList.mockRejectedValue(new Error('network'));
    renderPage();

    expect(await screen.findByText('Unable to load workspaces')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try again/ })).toBeInTheDocument();
  });

  it('opens the full-page create-workspace flow from the header action', async () => {
    mockList.mockResolvedValue([]);
    const user = userEvent.setup();
    renderPage();

    await waitFor(() => expect(screen.getAllByRole('button', { name: /Create workspace/ }).length).toBeGreaterThan(0));
    const headerButton = screen.getAllByRole('button', { name: /Create workspace/ })[0];
    await user.click(headerButton);

    expect(mockPush).toHaveBeenCalledWith('/workspaces/new');
  });
});
