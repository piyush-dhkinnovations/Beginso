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
});
