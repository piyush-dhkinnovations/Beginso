/**
 * __tests__/components/dashboard/DashboardShell.test.tsx
 * Audit remediation: zero test coverage. Tests: respects the server-provided
 * initialCollapsed (the cookie-based fix that replaced the old
 * localStorage-plus-effect approach, which flashed expanded-then-collapsed
 * on reload), persists a toggle to the cookie, and the mobile nav drawer
 * (hamburger-triggered, closes on Escape/backdrop/nav-link-click).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardShell } from '@/components/dashboard/DashboardShell';

const mockUseAuth = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('@/components/dashboard/TopNav', () => ({
  TopNav: ({ onMenuClick }: { onMenuClick?: () => void }) => (
    <div data-testid="top-nav">
      <button onClick={onMenuClick}>open-menu</button>
    </div>
  ),
}));

vi.mock('@/components/dashboard/Sidebar', () => ({
  Sidebar: ({
    collapsed,
    onToggleCollapse,
    onCloseMobile,
  }: {
    collapsed?: boolean;
    onToggleCollapse?: () => void;
    onCloseMobile?: () => void;
  }) => (
    <div data-testid={onCloseMobile ? 'mobile-sidebar' : 'desktop-sidebar'} data-collapsed={String(!!collapsed)}>
      {onToggleCollapse && <button onClick={onToggleCollapse}>toggle-collapse</button>}
      {onCloseMobile && <button onClick={onCloseMobile}>nav-link</button>}
    </div>
  ),
}));

describe('DashboardShell component', () => {
  beforeEach(() => {
    document.cookie = 'sidebar_collapsed=; path=/; max-age=0';
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: true });
  });

  it('renders children only while the user is authenticated', () => {
    const { unmount } = render(<DashboardShell initialCollapsed={false}>{'page content'}</DashboardShell>);
    expect(screen.getByText('page content')).toBeInTheDocument();

    unmount();
    mockUseAuth.mockReturnValue({ isLoading: false, isAuthenticated: false });
    render(<DashboardShell initialCollapsed={false}>{'protected content'}</DashboardShell>);
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
  });

  it('respects the server-provided initialCollapsed state', () => {
    render(<DashboardShell initialCollapsed={true}>content</DashboardShell>);
    expect(screen.getByTestId('desktop-sidebar')).toHaveAttribute('data-collapsed', 'true');
  });

  it('keeps the mobile nav drawer closed until the TopNav menu button is clicked', () => {
    render(<DashboardShell initialCollapsed={false}>content</DashboardShell>);
    expect(screen.queryByTestId('mobile-sidebar')).not.toBeInTheDocument();
    expect(document.querySelector('.bg-neutral-900\\/40')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('open-menu'));

    expect(screen.getByTestId('mobile-sidebar')).toBeInTheDocument();
    expect(document.querySelector('.bg-neutral-900\\/40')).toBeInTheDocument();
  });

  it('closes the drawer when the backdrop is clicked', () => {
    render(<DashboardShell initialCollapsed={false}>content</DashboardShell>);
    fireEvent.click(screen.getByText('open-menu'));
    expect(screen.getByTestId('mobile-sidebar')).toBeInTheDocument();

    fireEvent.click(document.querySelector('[role="presentation"]')!);

    expect(screen.queryByTestId('mobile-sidebar')).not.toBeInTheDocument();
  });

  it('closes the drawer when a nav link inside it is clicked', () => {
    render(<DashboardShell initialCollapsed={false}>content</DashboardShell>);
    fireEvent.click(screen.getByText('open-menu'));

    fireEvent.click(screen.getByText('nav-link'));

    expect(screen.queryByTestId('mobile-sidebar')).not.toBeInTheDocument();
  });

  it('closes the drawer on Escape', () => {
    render(<DashboardShell initialCollapsed={false}>content</DashboardShell>);
    fireEvent.click(screen.getByText('open-menu'));
    expect(screen.getByTestId('mobile-sidebar')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByTestId('mobile-sidebar')).not.toBeInTheDocument();
  });

  it('flips collapsed state and persists it to the sidebar_collapsed cookie on toggle', () => {
    render(<DashboardShell initialCollapsed={false}>content</DashboardShell>);
    expect(screen.getByTestId('desktop-sidebar')).toHaveAttribute('data-collapsed', 'false');

    fireEvent.click(screen.getByText('toggle-collapse'));

    expect(screen.getByTestId('desktop-sidebar')).toHaveAttribute('data-collapsed', 'true');
    expect(document.cookie).toContain('sidebar_collapsed=true');
  });

  it('establishes a container-query boundary for shell responsiveness', () => {
    const { container } = render(<DashboardShell initialCollapsed={false}>content</DashboardShell>);
    expect(container.firstElementChild).toHaveClass('dashboard-shell');
  });
});
