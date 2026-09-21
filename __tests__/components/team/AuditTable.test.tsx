/**
 * sprint-10-events-migration, tasks.md 4.3 — design.md §21, requirements.md §7.7, §11.
 * Same assertion style RolesMatrix.test.tsx established.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { AuditTable } from '@/components/team/AuditTable';
import type { WorkspaceEventItem } from '@/types/event';

const EVENT: WorkspaceEventItem = {
  id: 'e1',
  actorName: 'Priya Sharma',
  action: 'member.role_changed',
  targetType: 'member',
  targetId: 'm1',
  targetLabel: 'Chidi Okafor',
  createdAt: '2026-09-21T10:30:00.000Z',
  ip: '203.0.xxx.xxx',
};

describe('AuditTable', () => {
  it('exposes the five real column headers through the scroll wrapper', () => {
    render(<AuditTable events={[EVENT]} />);
    const table = screen.getByRole('table');
    ['Actor', 'Action', 'Target', 'IP', 'Timestamp'].forEach((name) => {
      expect(within(table).getByRole('columnheader', { name })).toHaveAttribute('scope', 'col');
    });
  });

  it('makes the actor the row header and fills every cell from the event', () => {
    render(<AuditTable events={[EVENT]} />);

    const row = screen.getByRole('rowheader', { name: 'Priya Sharma' }).closest('tr')!;
    const cells = within(row).getAllByRole('cell');
    expect(cells[0]).toHaveTextContent('changed a member role on');
    expect(cells[1]).toHaveTextContent('Chidi Okafor');
    expect(cells[2]).toHaveTextContent('203.0.xxx.xxx');
    expect(cells[3]).not.toBeEmptyDOMElement();
  });

  it('shows "—" rather than an empty cell when the backend sends no IP', () => {
    render(<AuditTable events={[{ ...EVENT, ip: undefined }]} />);

    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('hides Target and IP below the sm breakpoint via a responsive class, never a .wf- class', () => {
    render(<AuditTable events={[EVENT]} />);

    for (const name of ['Target', 'IP']) {
      const th = screen.getByRole('columnheader', { name });
      expect(th.className).toContain('hidden');
      expect(th.className).toContain('sm:table-cell');
      expect(th.className).not.toContain('wf-');
    }
    expect(screen.getByRole('columnheader', { name: 'Actor' }).className).not.toContain('hidden');
  });

  it('keeps a real <table> (never stacked into cards) with no .bg-table-stack', () => {
    render(<AuditTable events={[EVENT]} />);

    expect(screen.getByRole('table').className).not.toContain('bg-table-stack');
  });

  it('renders five skeleton rows while loading, not events', () => {
    const { container } = render(<AuditTable events={[EVENT]} isLoading />);

    expect(container.querySelectorAll('tbody tr')).toHaveLength(5);
    expect(screen.queryByText('Priya Sharma')).not.toBeInTheDocument();
  });
});
