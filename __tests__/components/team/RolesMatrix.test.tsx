/**
 * __tests__/components/team/RolesMatrix.test.tsx
 * Feature: sprint-9-team-permissions, requirements.md §7.6, §11, design.md §21.
 */

import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { RolesMatrix } from '@/components/team/RolesMatrix';
import { CAPABILITIES } from '@/lib/roles';

describe('RolesMatrix', () => {
  it('renders all three capability groups as section headers', () => {
    render(<RolesMatrix />);
    expect(screen.getByText('Forms')).toBeInTheDocument();
    expect(screen.getByText('Responses')).toBeInTheDocument();
    expect(screen.getByText('Workspace')).toBeInTheDocument();
  });

  it('renders all four role columns', () => {
    render(<RolesMatrix />);
    const table = screen.getByRole('table');
    ['Capability', 'Owner', 'Admin', 'Editor', 'Reviewer'].forEach((name) => {
      expect(within(table).getByRole('columnheader', { name })).toBeInTheDocument();
    });
  });

  it('renders every capability row from the single CAPABILITIES source', () => {
    render(<RolesMatrix />);
    for (const group of CAPABILITIES) {
      for (const item of group.items) {
        expect(screen.getByRole('rowheader', { name: item.label })).toBeInTheDocument();
      }
    }
  });

  it('reserves form deletion for Owner only, matching CAPABILITIES', () => {
    render(<RolesMatrix />);
    const row = screen.getByRole('rowheader', { name: 'Delete form' }).closest('tr')!;
    const cells = within(row).getAllByRole('cell');
    expect(within(cells[0]).getByText('Allowed')).toBeInTheDocument();
    expect(within(cells[1]).getByText('Not allowed')).toBeInTheDocument();
    expect(within(cells[2]).getByText('Not allowed')).toBeInTheDocument();
    expect(within(cells[3]).getByText('Not allowed')).toBeInTheDocument();
  });

  it('keeps real table semantics — a genuine <table> with column and row headers', () => {
    render(<RolesMatrix />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('rowheader').length).toBe(CAPABILITIES.flatMap((g) => g.items).length);
  });
});
