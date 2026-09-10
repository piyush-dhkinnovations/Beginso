/**
 * __tests__/app/w/[slug]/layout.test.tsx
 * Feature: sprint-8-workspaces-context, requirements.md §7.1, §12
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  notFound,
  usePathname: () => '/w/acme',
  useRouter: () => ({ push: mockPush }),
}));

const mockCookieGet = vi.fn();
vi.mock('next/headers', () => ({
  cookies: () => Promise.resolve({ get: mockCookieGet }),
}));

const resolveWorkspaceBySlug = vi.fn();
vi.mock('@/lib/workspaceServer', () => ({ resolveWorkspaceBySlug: (...args: unknown[]) => resolveWorkspaceBySlug(...args) }));

// WorkspaceContextSwitcher (rendered inside the layout's TopBar) fetches the workspace list via
// TanStack Query — mock the service so this stays a unit test of the layout's own 403/404/shell
// boundary, not an integration test of the switcher (that's WorkspaceContextSwitcher.test.tsx).
vi.mock('@/services/workspaces', () => ({ workspacesService: { list: () => Promise.resolve([]) } }));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'u1', email: 'test@example.com', displayName: 'Test User' },
    logout: vi.fn(),
    isLoading: false,
  }),
}));

function withQueryClient(node: React.ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{node}</QueryClientProvider>;
}

describe('/w/[slug]/layout — route-level membership boundary', () => {
  beforeEach(() => {
    notFound.mockClear();
    resolveWorkspaceBySlug.mockReset();
    mockCookieGet.mockImplementation((name: string) => {
      if (name === 'beginso_session') return { value: 'a-token' };
      return undefined;
    });
  });

  it('renders the shell with the workspace name when the caller is a member', async () => {
    resolveWorkspaceBySlug.mockResolvedValue({
      ok: true,
      workspace: { id: 'w1', name: 'Acme', slug: 'acme', timezone: 'UTC', createdAt: '', updatedAt: '' },
    });
    const { default: WorkspaceLayout } = await import('@/app/w/[slug]/layout');
    const jsx = await WorkspaceLayout({
      children: <div>child content</div>,
      params: Promise.resolve({ slug: 'acme' }),
    });
    render(withQueryClient(jsx));
    expect(screen.getByText('Acme')).toBeInTheDocument();
    expect(screen.getByText('child content')).toBeInTheDocument();
  });

  // Sprint 9 (team-permissions), requirements.md §7.7/§8.7 — role threaded from
  // resolveWorkspaceBySlug() down to WorkspaceSidebar's role-gated "Team" item.
  it('threads the caller\'s role through to the sidebar\'s role-gated Team item', async () => {
    resolveWorkspaceBySlug.mockResolvedValue({
      ok: true,
      workspace: { id: 'w1', name: 'Acme', slug: 'acme', timezone: 'UTC', createdAt: '', updatedAt: '' },
      role: 'owner',
      isOwner: true,
    });
    const { default: WorkspaceLayout } = await import('@/app/w/[slug]/layout');
    const jsx = await WorkspaceLayout({
      children: <div>child content</div>,
      params: Promise.resolve({ slug: 'acme' }),
    });
    render(withQueryClient(jsx));
    expect(screen.getByRole('link', { name: 'Team' })).toHaveAttribute('href', '/w/acme/team');
  });

  it('hides the Team item when role is not yet returned by the backend (BE 0.1 gap)', async () => {
    resolveWorkspaceBySlug.mockResolvedValue({
      ok: true,
      workspace: { id: 'w1', name: 'Acme', slug: 'acme', timezone: 'UTC', createdAt: '', updatedAt: '' },
      // role omitted, matching today's live response shape
    });
    const { default: WorkspaceLayout } = await import('@/app/w/[slug]/layout');
    const jsx = await WorkspaceLayout({
      children: <div>child content</div>,
      params: Promise.resolve({ slug: 'acme' }),
    });
    render(withQueryClient(jsx));
    expect(screen.queryByRole('link', { name: 'Team' })).not.toBeInTheDocument();
  });

  it('renders the access-denied state, not the shell, on a 403', async () => {
    resolveWorkspaceBySlug.mockResolvedValue({ ok: false, status: 403 });
    const { default: WorkspaceLayout } = await import('@/app/w/[slug]/layout');
    const jsx = await WorkspaceLayout({
      children: <div>child content</div>,
      params: Promise.resolve({ slug: 'acme' }),
    });
    render(withQueryClient(jsx));
    expect(screen.getByText("You don't have access to this workspace")).toBeInTheDocument();
    expect(screen.queryByText('child content')).not.toBeInTheDocument();
  });

  it('calls notFound() on a 404, never reaching the shell', async () => {
    resolveWorkspaceBySlug.mockResolvedValue({ ok: false, status: 404 });
    const { default: WorkspaceLayout } = await import('@/app/w/[slug]/layout');
    await expect(
      WorkspaceLayout({ children: <div>child content</div>, params: Promise.resolve({ slug: 'ghost' }) })
    ).rejects.toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledOnce();
  });

  it('renders a retryable error state, not notFound(), on a non-404/403 lookup failure', async () => {
    // The bug this guards against: a network error or 500 from the backend used to be
    // indistinguishable from "workspace doesn't exist" and called notFound() — a transient
    // failure should be retryable, not a permanent 404.
    resolveWorkspaceBySlug.mockResolvedValue({ ok: false, status: 'error' });
    const { default: WorkspaceLayout } = await import('@/app/w/[slug]/layout');
    const jsx = await WorkspaceLayout({
      children: <div>child content</div>,
      params: Promise.resolve({ slug: 'acme' }),
    });
    render(withQueryClient(jsx));
    expect(screen.getByText("Couldn't load this workspace")).toBeInTheDocument();
    expect(screen.queryByText('child content')).not.toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });
});
