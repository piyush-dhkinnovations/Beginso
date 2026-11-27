import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SharedFormCard } from '@/components/team/SharedFormCard';
import type { SharedFormItem } from '@/types/team';

const WORKSPACE_SHARE: SharedFormItem = {
  id: 'f1',
  title: 'Customer Survey',
  sharedByName: 'Priya Shah',
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
    // Workspace name and the "· Shared by X" suffix are sibling text nodes in the same <p>, so
    // an exact getByText('Acme Inc') matches no single node's full text — substring
    // match against the paragraph's combined content instead.
    expect(screen.getByText(/Acme Inc/)).toBeInTheDocument();
  });

  // The raw backend `sharedBy` was once a userId with no name anywhere in the payload (22 Sep 2026);
  // the sharer's name comes from services/shared.ts's resolveSharedByName().
  it('renders the sharer\'s name when the backend provided one', () => {
    render(<SharedFormCard item={WORKSPACE_SHARE} />);
    expect(screen.getByText(/Shared by Priya Shah/)).toBeInTheDocument();
  });

  it('renders no "shared by" clause, never a raw id, when the backend gave no name', () => {
    render(<SharedFormCard item={{ ...WORKSPACE_SHARE, sharedByName: undefined }} />);
    expect(screen.queryByText(/Shared by/)).not.toBeInTheDocument();
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
    expect(screen.getByRole('link')).toHaveAttribute('href', '/forms/f1/inbox');
  });

  it('shows the own logo of the form (the same mark as the Forms list), not a generic icon', () => {
    const { container } = render(<SharedFormCard item={{ ...WORKSPACE_SHARE, branding: { logoUrl: 'https://cdn.example.com/a.png' } }} />);
    expect(container.querySelector('img[src="https://cdn.example.com/a.png"]')).not.toBeNull();
  });
});
