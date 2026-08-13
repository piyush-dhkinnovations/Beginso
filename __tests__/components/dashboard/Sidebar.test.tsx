/**
 * __tests__/components/dashboard/Sidebar.test.tsx
 * Audit remediation: Sidebar had zero test coverage. Tests: active-route
 * highlighting, collapse/expand toggle callback, and the leave-builder-guard
 * interception added in this same remediation pass (dirty builder session +
 * on the /forms/[id]/edit route → intercept nav clicks instead of navigating).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '@/components/dashboard/Sidebar';

vi.mock('next/link', () => ({
  default: ({ href, children, onClick, ...props }: { href: string; children: React.ReactNode; onClick?: (e: React.MouseEvent) => void; [key: string]: unknown }) => (
    <a href={href} onClick={onClick} {...props}>{children}</a>
  ),
}));

const mockPathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

let mockStoreState: { dirty: boolean; setPendingLeaveUrl: ReturnType<typeof vi.fn> };
vi.mock('@/store/builderStore', () => ({
  useBuilderStore: (selector: (s: typeof mockStoreState) => unknown) => selector(mockStoreState),
}));

describe('Sidebar component', () => {
  beforeEach(() => {
    mockStoreState = { dirty: false, setPendingLeaveUrl: vi.fn() };
    mockPathname.mockReturnValue('/dashboard');
  });

  it('renders every nav item', () => {
    render(<Sidebar />);
    ['Dashboard', 'Forms', 'Templates', 'Responses', 'Analytics', 'Reports', 'Settings'].forEach((name) => {
      expect(screen.getByText(name)).toBeInTheDocument();
    });
  });

  it('calls onCloseMobile after a nav link is clicked (mobile drawer usage)', () => {
    const onCloseMobile = vi.fn();
    render(<Sidebar onCloseMobile={onCloseMobile} />);
    fireEvent.click(screen.getByText('Forms'));
    expect(onCloseMobile).toHaveBeenCalledTimes(1);
  });

  it('highlights the active route', () => {
    mockPathname.mockReturnValue('/forms');
    render(<Sidebar />);
    const formsLink = screen.getByText('Forms').closest('a');
    expect(formsLink?.className).toContain('bg-brand-50');
  });

  it('does not highlight inactive routes', () => {
    mockPathname.mockReturnValue('/forms');
    render(<Sidebar />);
    const dashboardLink = screen.getByText('Dashboard').closest('a');
    expect(dashboardLink?.className).not.toContain('bg-brand-50');
  });

  it('highlights Responses when viewing a specific form\'s response table', () => {
    // Feature: sprint-4-responses, Requirement 1.7 — /forms/[id]/responses isn't
    // under /responses, so the generic startsWith(href) check alone misses it.
    mockPathname.mockReturnValue('/forms/abc123/responses');
    render(<Sidebar />);
    const responsesLink = screen.getByText('Responses').closest('a');
    expect(responsesLink?.className).toContain('bg-brand-50');
  });

  it('highlights Responses on the response detail route', () => {
    mockPathname.mockReturnValue('/responses/resp-1');
    render(<Sidebar />);
    const responsesLink = screen.getByText('Responses').closest('a');
    expect(responsesLink?.className).toContain('bg-brand-50');
  });

  it('highlights Analytics when viewing a specific form\'s Auto-Dashboard', () => {
    // Feature: sprint-5-analytics-reports, Requirement 1.5 — /forms/[id]/analytics isn't under
    // /analytics, so the generic startsWith(href) check alone misses it.
    mockPathname.mockReturnValue('/forms/abc123/analytics');
    render(<Sidebar />);
    const analyticsLink = screen.getByText('Analytics').closest('a');
    expect(analyticsLink?.className).toContain('bg-brand-50');
  });

  it('does not highlight Analytics for an unrelated /forms/[id]/... route', () => {
    mockPathname.mockReturnValue('/forms/abc123/responses');
    render(<Sidebar />);
    const analyticsLink = screen.getByText('Analytics').closest('a');
    expect(analyticsLink?.className).not.toContain('bg-brand-50');
  });

  it('calls onToggleCollapse when the collapse button is clicked', () => {
    const onToggleCollapse = vi.fn();
    render(<Sidebar collapsed={false} onToggleCollapse={onToggleCollapse} />);
    fireEvent.click(screen.getByLabelText('Collapse sidebar'));
    expect(onToggleCollapse).toHaveBeenCalledTimes(1);
  });

  it('hides nav item labels when collapsed', () => {
    render(<Sidebar collapsed />);
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('navigates normally when there is no dirty builder session', () => {
    mockPathname.mockReturnValue('/dashboard');
    render(<Sidebar />);
    fireEvent.click(screen.getByText('Forms'));
    expect(mockStoreState.setPendingLeaveUrl).not.toHaveBeenCalled();
  });

  it('intercepts nav clicks with the pending URL when dirty and on the builder route', () => {
    mockStoreState.dirty = true;
    mockPathname.mockReturnValue('/forms/abc123/edit');
    render(<Sidebar />);
    fireEvent.click(screen.getByText('Dashboard'));
    expect(mockStoreState.setPendingLeaveUrl).toHaveBeenCalledWith('/dashboard');
  });

  it('does not intercept when dirty but not on the builder route', () => {
    mockStoreState.dirty = true;
    mockPathname.mockReturnValue('/dashboard');
    render(<Sidebar />);
    fireEvent.click(screen.getByText('Forms'));
    expect(mockStoreState.setPendingLeaveUrl).not.toHaveBeenCalled();
  });
});
