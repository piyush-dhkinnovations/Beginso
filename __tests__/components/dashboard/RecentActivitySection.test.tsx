/**
 * __tests__/components/dashboard/RecentActivitySection.test.tsx
 * Audit remediation: zero test coverage. No real activity-feed data source
 * exists yet (see the component's own `ponytail:` comment) — this locks in
 * the current, honest behavior: always an EmptyState, with copy and the
 * "create your first form" action varying by the `hasForms` prop.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecentActivitySection } from '@/components/dashboard/RecentActivitySection';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('RecentActivitySection component', () => {
  it('shows the "no forms yet" empty state with a create-form action by default', () => {
    render(<RecentActivitySection />);
    expect(screen.getByText('No forms created yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first form')).toBeInTheDocument();
  });

  it('shows the "no recent activity" empty state with no action once forms exist', () => {
    render(<RecentActivitySection hasForms />);
    expect(screen.getByText('No recent activity')).toBeInTheDocument();
    expect(screen.queryByText('Create your first form')).not.toBeInTheDocument();
  });
});
