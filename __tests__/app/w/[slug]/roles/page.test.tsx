/**
 * __tests__/app/w/[slug]/roles/page.test.tsx
 * Feature: sprint-9-team-permissions, requirements.md §7.6, design.md §5/§21.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import RolesPage from '@/app/w/[slug]/roles/page';

describe('RolesPage (/w/[slug]/roles)', () => {
  it('renders the page heading', () => {
    render(<RolesPage />);
    expect(screen.getByText('Roles & Permissions')).toBeInTheDocument();
    expect(screen.getByText('Read-only in this release — permission levels are fixed per role.')).toBeInTheDocument();
  });

  it('renders all three capability groups and all four role columns', () => {
    render(<RolesPage />);
    ['Forms', 'Responses', 'Workspace'].forEach((group) => expect(screen.getByText(group)).toBeInTheDocument());
    ['Owner', 'Admin', 'Editor', 'Reviewer'].forEach((role) =>
      expect(screen.getByRole('columnheader', { name: role })).toBeInTheDocument()
    );
  });

  it('says Editors can see Activity and the member list (A9-009)', () => {
    render(<RolesPage />);
    expect(screen.getByText(/Editors can also see the workspace Activity feed and the member list/)).toBeInTheDocument();
  });

  // design.md §5/§21 — the matrix is static data; this page must never show a loading state.
  it('never shows a loading state — there is no useQuery on this page', () => {
    render(<RolesPage />);
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    expect(screen.getByRole('table')).toBeInTheDocument();
  });
});
