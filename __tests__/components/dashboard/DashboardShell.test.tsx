/**
 * __tests__/components/dashboard/DashboardShell.test.tsx
 * Audit remediation: zero test coverage. Tests: respects the server-provided
 * initialCollapsed (the cookie-based fix that replaced the old
 * localStorage-plus-effect approach, which flashed expanded-then-collapsed
 * on reload), persists a toggle to the cookie, and opens/closes the mobile
 * drawer including the backdrop-click-to-close path.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

vi.mock('@/components/dashboard/TopNav', () => ({
  TopNav: ({ onToggleMobileSidebar }: { onToggleMobileSidebar: () => void }) => (
    <button onClick={onToggleMobileSidebar}>toggle-mobile</button>
  ),
}));

vi.mock('@/components/dashboard/Sidebar', () => ({
  Sidebar: ({
    collapsed,
    isMobile,
    onToggleCollapse,
  }: {
    collapsed?: boolean;
    isMobile?: boolean;
    onToggleCollapse?: () => void;
  }) => (
    <div data-testid={isMobile ? 'mobile-sidebar' : 'desktop-sidebar'} data-collapsed={String(!!collapsed)}>
      {onToggleCollapse && <button onClick={onToggleCollapse}>toggle-collapse</button>}
    </div>
  ),
}));

describe('DashboardShell component', () => {
  beforeEach(() => {
    document.cookie = 'sidebar_collapsed=; path=/; max-age=0';
  });

  it('renders children in the main content area', () => {
    render(<DashboardShell initialCollapsed={false}>{'page content'}</DashboardShell>);
    expect(screen.getByText('page content')).toBeInTheDocument();
  });

  it('respects the server-provided initialCollapsed state', () => {
    render(<DashboardShell initialCollapsed={true}>content</DashboardShell>);
    expect(screen.getByTestId('desktop-sidebar')).toHaveAttribute('data-collapsed', 'true');
  });

  it('does not render the mobile sidebar/backdrop by default', () => {
    render(<DashboardShell initialCollapsed={false}>content</DashboardShell>);
    expect(screen.queryByTestId('mobile-sidebar')).not.toBeInTheDocument();
  });

  it('flips collapsed state and persists it to the sidebar_collapsed cookie on toggle', () => {
    render(<DashboardShell initialCollapsed={false}>content</DashboardShell>);
    expect(screen.getByTestId('desktop-sidebar')).toHaveAttribute('data-collapsed', 'false');

    fireEvent.click(screen.getByText('toggle-collapse'));

    expect(screen.getByTestId('desktop-sidebar')).toHaveAttribute('data-collapsed', 'true');
    expect(document.cookie).toContain('sidebar_collapsed=true');
  });

  it('opens the mobile sidebar when TopNav requests it, and closes it via the backdrop', () => {
    const { container } = render(<DashboardShell initialCollapsed={false}>content</DashboardShell>);
    fireEvent.click(screen.getByText('toggle-mobile'));
    expect(screen.getByTestId('mobile-sidebar')).toBeInTheDocument();

    const backdrop = container.querySelector('.bg-neutral-900\\/40');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(screen.queryByTestId('mobile-sidebar')).not.toBeInTheDocument();
  });
});
