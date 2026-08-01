/**
 * __tests__/components/dashboard/DashboardHeader.test.tsx
 * Audit remediation: zero test coverage. Tests: title always renders,
 * subtitle and children (e.g. a page action button) are optional.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';

describe('DashboardHeader component', () => {
  it('renders the title', () => {
    render(<DashboardHeader title="Forms" />);
    expect(screen.getByRole('heading', { name: 'Forms' })).toBeInTheDocument();
  });

  it('renders the subtitle when provided', () => {
    render(<DashboardHeader title="Forms" subtitle="Build and manage your forms." />);
    expect(screen.getByText('Build and manage your forms.')).toBeInTheDocument();
  });

  it('omits the subtitle when not provided', () => {
    render(<DashboardHeader title="Forms" />);
    expect(screen.queryByText('Build and manage your forms.')).not.toBeInTheDocument();
  });

  it('renders children (e.g. a page action button)', () => {
    render(
      <DashboardHeader title="Forms">
        <button>Create Form</button>
      </DashboardHeader>
    );
    expect(screen.getByRole('button', { name: 'Create Form' })).toBeInTheDocument();
  });
});
