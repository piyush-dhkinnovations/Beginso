/**
 * __tests__/components/team/SharedFormCard.test.tsx
 * Feature: sprint-9-team-permissions, requirements.md §7.9, design.md §15.6.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SharedFormCard } from '@/components/team/SharedFormCard';
import type { SharedFormItem } from '@/types/team';

const WORKSPACE_SHARE: SharedFormItem = {
  id: 'f1',
  title: 'Customer Survey',
  sharedBy: 'u-priya',
  workspaceName: 'Acme Inc',
  role: 'viewer',
  accessLevel: 'read',
  sharedAt: new Date().toISOString(),
};

const PERSONAL_SHARE: SharedFormItem = {
  ...WORKSPACE_SHARE,
  id: 'f2',
  workspaceName: null,
};

describe('SharedFormCard', () => {
  it('renders the form title and workspace name', () => {
    render(<SharedFormCard item={WORKSPACE_SHARE} />);
    expect(screen.getByText('Customer Survey')).toBeInTheDocument();
    expect(screen.getByText('Acme Inc')).toBeInTheDocument();
  });

  // The real backend's `sharedBy` is a raw userId, not a populated name (backend_updates_for_
  // frontend.md §13) — nothing here to display as a person, so the card must not invent one.
  it('does not render a raw userId as if it were a display name', () => {
    render(<SharedFormCard item={WORKSPACE_SHARE} />);
    expect(screen.queryByText(/u-priya/)).not.toBeInTheDocument();
  });

  it('renders "Personal" when the shared form is itself standalone (no workspace)', () => {
    render(<SharedFormCard item={PERSONAL_SHARE} />);
    expect(screen.getByText(/Personal/)).toBeInTheDocument();
  });

  it("renders the recipient's scoped role", () => {
    render(<SharedFormCard item={WORKSPACE_SHARE} />);
    expect(screen.getByText('Reviewer')).toBeInTheDocument();
  });

  it('links to the form, opening it at the nearest existing view', () => {
    render(<SharedFormCard item={WORKSPACE_SHARE} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/forms/f1/responses');
  });
});
