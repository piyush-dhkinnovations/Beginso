/**
 * __tests__/components/dashboard/QuickActionsSection.test.tsx
 * Audit remediation: zero test coverage. Tests: all 3 actions render and
 * point at real routes (regression check for problem.md's I-6 — Quick
 * Action links previously pointed at a non-existent /forms/new route).
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuickActionsSection } from '@/components/dashboard/QuickActionsSection';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('QuickActionsSection component', () => {
  it('renders the section heading', () => {
    render(<QuickActionsSection />);
    expect(screen.getByText('Quick Actions')).toBeInTheDocument();
  });

  it('renders "Create new form" linking to /forms', () => {
    render(<QuickActionsSection />);
    const link = screen.getByText('Create new form').closest('a');
    expect(link).toHaveAttribute('href', '/forms');
  });

  it('renders "View all forms" linking to /forms', () => {
    render(<QuickActionsSection />);
    const link = screen.getByText('View all forms').closest('a');
    expect(link).toHaveAttribute('href', '/forms');
  });

  it('renders "View responses" linking to /responses', () => {
    render(<QuickActionsSection />);
    const link = screen.getByText('View responses').closest('a');
    expect(link).toHaveAttribute('href', '/responses');
  });
});
