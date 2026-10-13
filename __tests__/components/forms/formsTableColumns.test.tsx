import { describe, it, expect } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Table } from '@/components/ui/Table';
import { buildFormColumns } from '@/components/forms/formsTableColumns';
import { makeForm, makeState } from './formsTestUtils';
import type { FormsContext } from '@/types/workspace';

const personal: FormsContext = { type: 'personal' };

function renderTable(stateOver: Record<string, unknown> = {}, forms = [makeForm({ title: 'Alpha', status: 'published', responseCount: 7 })], ctx: FormsContext = personal) {
  const s = makeState({ rows: forms, ...stateOver });
  render(<Table columns={buildFormColumns(s, ctx)} rows={forms} rowKey={(f) => f._id} />);
  return s;
}

describe('buildFormColumns', () => {
  it('has no select column until the user is selecting', () => {
    renderTable({ selecting: false });
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Form Title', 'Owner', 'Status', 'Responses', 'Updated', '']);
  });

  it('omits the select column for roles that cannot delete, even while "selecting"', () => {
    renderTable({ selecting: true, canDelete: false });
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });

  it('renders the title link to the overview, status badge and response count', () => {
    renderTable();
    expect(screen.getByRole('link', { name: 'Alpha' })).toHaveAttribute('href', '/forms/f1/overview');
    expect(screen.getByText('Published')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('adds ?ws= to the title link inside a workspace', () => {
    renderTable({}, undefined, { type: 'workspace', workspaceId: 'w1' });
    expect(screen.getByRole('link', { name: 'Alpha' })).toHaveAttribute('href', '/forms/f1/overview?ws=w1');
  });

  it('shows the owner in the subline and the monogram when the owner is known', () => {
    renderTable({ ownerName: () => 'Asha Rao' });
    expect(screen.getByText(/Asha Rao · created/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Owned by Asha Rao' })).toHaveTextContent('AR');
  });

  it('shows "Owner unknown" and no owner prefix when there is no owner', () => {
    renderTable();
    expect(screen.getByRole('img', { name: 'Owner unknown' })).toBeInTheDocument();
    expect(screen.getByText(/^created /)).toBeInTheDocument();
  });

  it('flags a pinned form for screen readers', () => {
    renderTable({}, [makeForm({ pinned: true })]);
    expect(screen.getByText('Pinned')).toHaveClass('sr-only');
  });

  it('a plain title click opens-or-selects instead of navigating (when deletion is allowed)', async () => {
    const f = makeForm();
    const s = renderTable({}, [f]);
    await userEvent.click(screen.getByRole('link', { name: 'Customer Survey' }));
    expect(s.openOrSelect).toHaveBeenCalledWith(f);
  });

  it('a modifier-click on the title is left to the browser', () => {
    const s = renderTable();
    fireEvent.click(screen.getByRole('link', { name: 'Alpha' }), { ctrlKey: true });
    expect(s.openOrSelect).not.toHaveBeenCalled();
  });

  it('title links navigate natively when the user cannot delete (no selection mode)', async () => {
    const s = renderTable({ canDelete: false });
    // Prevent jsdom navigation noise: assert only that our handler was not attached.
    fireEvent.click(screen.getByRole('link', { name: 'Alpha' }));
    expect(s.openOrSelect).not.toHaveBeenCalled();
  });

  it('while selecting, each row has a labelled checkbox that adds and removes its id', async () => {
    const f = makeForm({ title: 'Alpha' });
    const s = renderTable({ selecting: true, selectedIds: new Set(['f1']) }, [f]);
    const box = screen.getByRole('checkbox', { name: 'Select Alpha' });
    expect(box).toBeChecked();
    await userEvent.click(box);
    const updater = (s.setSelectedIds as unknown as { mock: { calls: [(p: Set<string>) => Set<string>][] } }).mock.calls[0][0];
    expect([...updater(new Set(['f1', 'zz']))]).toEqual(['zz']);
    expect([...updater(new Set())]).toEqual([]);
  });

  it('select-all adds every row on the page and its label reflects state', async () => {
    const forms = [makeForm({ _id: 'a', title: 'A' }), makeForm({ _id: 'b', title: 'B' })];
    const s = renderTable({ selecting: true, rows: forms }, forms);
    const all = screen.getByRole('checkbox', { name: 'Select all forms on this page' });
    await userEvent.click(all);
    const updater = (s.setSelectedIds as unknown as { mock: { calls: [(p: Set<string>) => Set<string>][] } }).mock.calls[0][0];
    expect([...updater(new Set(['other']))].sort()).toEqual(['a', 'b', 'other']);
  });

  it('select-all label flips and is indeterminate when only some are selected', () => {
    const forms = [makeForm({ _id: 'a', title: 'A' })];
    renderTable({ selecting: true, rows: forms, allOnPageSelected: true }, forms);
    expect(screen.getByRole('checkbox', { name: 'Deselect all forms on this page' })).toBeChecked();
  });

  it('indeterminate state is applied to the header checkbox', () => {
    const forms = [makeForm({ _id: 'a', title: 'A' })];
    renderTable({ selecting: true, rows: forms, someOnPageSelected: true }, forms);
    expect((screen.getByRole('checkbox', { name: 'Select all forms on this page' }) as HTMLInputElement).indeterminate).toBe(true);
  });

  it('every row has an actions menu named after the form', () => {
    renderTable();
    const row = screen.getAllByRole('row')[1];
    expect(within(row).getByRole('button', { name: 'Actions for Alpha' })).toBeInTheDocument();
  });
});
