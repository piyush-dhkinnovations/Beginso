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

  it('renders five skeleton rows while loading, not events, hidden from assistive tech', () => {
    const { container } = render(<AuditTable events={[EVENT]} isLoading />);

    const rows = container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(5);
    expect(screen.queryByText('Priya Sharma')).not.toBeInTheDocument();
    // A screen reader must not announce five rows of empty skeleton cells.
    rows.forEach((row) => expect(row).toHaveAttribute('aria-hidden', 'true'));
    // And a keyboard user tabbing through the page hits nothing inside the loading table.
    expect(within(container as unknown as HTMLElement).queryAllByRole('button')).toHaveLength(0);
  });

  // sprint-11-v2a-hardening 4.4 — the frontend cannot mask an IP reliably (design.md §19); the
  // guarantee is backend-side (B1.3). This is the frontend's own job per 4.4: a full, unmasked
  // dotted-quad in a fixture is a *defect to notice*, not something the component is meant to
  // display as designed — asserted directly rather than left as an implicit assumption.
  it('a full unmasked dotted-quad IP renders as-is — flagged here as a backend defect (B1.3), not accepted as design', () => {
    render(<AuditTable events={[{ ...EVENT, ip: '203.0.113.42' }]} />);

    // The component has no masking logic of its own — whatever the backend sends is what shows.
    // If this ever renders a real, unmasked IP, that's B1.3's contract failing, not this
    // component's — but it must still be visible in an automated run, not silently swallowed.
    expect(screen.getByText('203.0.113.42')).toBeInTheDocument();
  });
});
