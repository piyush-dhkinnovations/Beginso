/**
 * sprint-10-events-migration, tasks.md 4.3 — design.md §21, requirements.md §7.7, §11.
 * Same assertion style RolesMatrix.test.tsx established.
 */
import { describe, it, expect } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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
  it('exposes the three real column headers through the scroll wrapper', () => {
    render(<AuditTable events={[EVENT]} />);
    const table = screen.getByRole('table');
    ['Actor', 'Event', 'When'].forEach((name) => {
      expect(within(table).getByRole('columnheader', { name })).toHaveAttribute('scope', 'col');
    });
  });

  it('makes the actor the row header and reads action and target as one sentence', () => {
    render(<AuditTable events={[EVENT]} />);

    const row = screen.getByRole('rowheader', { name: /Priya Sharma/ }).closest('tr')!;
    const cells = within(row).getAllByRole('cell');
    expect(cells[0]).toHaveTextContent('changed a member role on Chidi Okafor');
    expect(cells[1]).not.toBeEmptyDOMElement();
  });

  it('never shows the origin hash or IP', () => {
    render(<AuditTable events={[EVENT, { ...EVENT, id: 'e2', ip: '203.0.113.42' }]} />);

    expect(screen.queryByText(/203\.0/)).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Origin' })).not.toBeInTheDocument();
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
});

describe('AuditTable actor avatars', () => {
  it("shows the actor's picture beside their name, with the name still the row header", () => {
    const { container } = render(<AuditTable events={[EVENT]} avatarOf={() => 'https://cdn.example.com/a/priya.png'} />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', 'https://cdn.example.com/a/priya.png');
    expect(img).toHaveAttribute('alt', ''); // decorative: the name is right beside it
    expect(screen.getByRole('rowheader', { name: 'Priya Sharma' })).toBeInTheDocument(); // not read twice
  });

  it('shows their initials when there is no picture', () => {
    const { container } = render(<AuditTable events={[EVENT]} avatarOf={() => undefined} />);
    expect(container.querySelector('img')).toBeNull();
    expect(within(screen.getByRole('rowheader')).getByText('PS')).toBeInTheDocument();
  });

  it('and when the picture cannot be loaded', () => {
    const { container } = render(<AuditTable events={[EVENT]} avatarOf={() => 'https://cdn.example.com/missing.png'} />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(within(screen.getByRole('rowheader')).getByText('PS')).toBeInTheDocument();
  });

  it("works without a lookup at all, and each row gets its own person's picture", () => {
    const { container, rerender } = render(<AuditTable events={[EVENT]} />);
    expect(container.querySelector('img')).toBeNull();
    const second = { ...EVENT, id: 'e2', actorName: 'Chidi Okafor' };
    rerender(<AuditTable events={[EVENT, second]} avatarOf={(e) => (e.actorName === 'Chidi Okafor' ? 'https://cdn.example.com/a/chidi.png' : undefined)} />);
    const imgs = container.querySelectorAll('img');
    expect(imgs).toHaveLength(1);
    expect(imgs[0]).toHaveAttribute('src', 'https://cdn.example.com/a/chidi.png');
  });
});
