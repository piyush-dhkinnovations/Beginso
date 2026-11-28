/**
 * Which sidebar links load their page ahead of a click: the four daily destinations do (next/link's default),
 * the rarely used ones do not.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersonalSidebar } from '@/components/workspaces/PersonalSidebar';
import { WorkspaceSidebar } from '@/components/workspaces/WorkspaceSidebar';

vi.mock('next/link', () => ({
  default: ({ href, prefetch, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; prefetch?: boolean }) => (
    <a href={href} data-prefetch={String(prefetch ?? 'default')} {...props}>
      {children}
    </a>
  ),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard', useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/dashboard/UserProfileDropdown', () => ({ UserProfileDropdown: () => null }));
vi.mock('@/components/workspaces/StorageUsage', () => ({ StorageUsage: () => null }));
vi.mock('@/components/workspaces/WorkspaceContextSwitcher', () => ({ WorkspaceContextSwitcher: () => null }));
vi.mock('@/services/forms', () => ({ formsService: { getForms: () => Promise.resolve({ forms: [], total: 1, page: 1, limit: 1 }) } }));
vi.mock('@/services/notifications', () => ({ notificationsService: { unreadCount: () => Promise.resolve(0) } }));
vi.mock('@/services/responses', () => ({ responsesService: { getStats: () => Promise.resolve({ total: 0, unread: 0 }) } }));

function prefetchByLabel(sidebar: React.ReactElement) {
  render(<QueryClientProvider client={new QueryClient()}>{sidebar}</QueryClientProvider>);
  return Object.fromEntries(screen.getAllByRole('link').map((a) => [a.textContent?.trim(), a.getAttribute('data-prefetch')]));
}

const daily = { Home: 'default', Forms: 'default', Responses: 'default', Insights: 'default' };
const off = (...labels: string[]) => Object.fromEntries(labels.map((label) => [label, 'false']));

describe('sidebar link prefetching', () => {
  it('personal sidebar', () => {
    expect(prefetchByLabel(<PersonalSidebar />)).toEqual({
      ...daily,
      ...off('Shared with me', 'Templates', 'My Submissions', 'Exports', 'Trash', 'Settings', 'Create workspace'),
    });
  });

  it('workspace sidebar (owner)', () => {
    expect(prefetchByLabel(<WorkspaceSidebar slug="acme" currentLabel="Acme" role="owner" />)).toEqual({
      ...daily,
      ...off('Templates', 'Exports', 'Activity', 'Team', 'Audit log', 'Settings', 'Trash'),
    });
  });
});
