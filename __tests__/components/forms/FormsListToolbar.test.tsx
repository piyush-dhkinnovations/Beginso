import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormsListToolbar } from '@/components/forms/FormsListToolbar';
import { makeState } from './formsTestUtils';

describe('FormsListToolbar', () => {
  it('typing in search updates the query, returns to page 1 and clears selection', async () => {
    const s = makeState();
    render(<FormsListToolbar s={s} />);
    await userEvent.type(screen.getByRole('textbox', { name: 'Search forms' }), 'a');
    expect(s.setSearch).toHaveBeenCalledWith('a');
    expect(s.setPage).toHaveBeenCalledWith(1);
    expect(s.setSelectedIds).toHaveBeenCalledWith(new Set());
  });

  it('shows the sort select only in grid view', () => {
    const { rerender } = render(<FormsListToolbar s={makeState({ view: 'list' })} />);
    expect(screen.queryByLabelText('Sort forms')).not.toBeInTheDocument();
    rerender(<FormsListToolbar s={makeState({ view: 'grid' })} />);
    expect(screen.getByLabelText('Sort forms')).toBeInTheDocument();
  });

  it('hides the sort select on the Pinned tab even in grid view', () => {
    render(<FormsListToolbar s={makeState({ view: 'grid', onPinnedTab: true })} />);
    expect(screen.queryByLabelText('Sort forms')).not.toBeInTheDocument();
  });

  it('reflects the current sort and splits the chosen value into key and direction', async () => {
    const s = makeState({ view: 'grid', sort: { key: 'updated', dir: 'desc' } });
    render(<FormsListToolbar s={s} />);
    const select = screen.getByLabelText('Sort forms') as HTMLSelectElement;
    expect(select.value).toBe('updated:desc');
    await userEvent.selectOptions(select, 'responses:desc');
    expect(s.setSort).toHaveBeenCalledWith({ key: 'responses', dir: 'desc' });
    await userEvent.selectOptions(select, 'title:asc');
    expect(s.setSort).toHaveBeenLastCalledWith({ key: 'title', dir: 'asc' });
  });

  it('the view switch reports the other view', async () => {
    const s = makeState({ view: 'list' });
    render(<FormsListToolbar s={s} />);
    expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(screen.getByRole('button', { name: 'Grid view' }));
    expect(s.setView).toHaveBeenCalledWith('grid');
  });
});
