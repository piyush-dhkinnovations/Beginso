import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormsResults } from '@/components/forms/FormsResults';
import { makeForm, makeState } from './formsTestUtils';
import type { FormsContext } from '@/types/workspace';

const personal: FormsContext = { type: 'personal' };
const forms = [makeForm({ _id: 'a', title: 'Alpha', responseCount: 5 }), makeForm({ _id: 'b', title: 'Beta', responseCount: 1 })];

describe('FormsResults', () => {
  it('shows an error alert with a working Retry when loading failed', async () => {
    const s = makeState({ error: new Error('x') });
    render(<FormsResults s={s} context={personal} />);
    expect(screen.getByText('Failed to load forms.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(s.refetch).toHaveBeenCalledTimes(1);
  });

  it('list view renders a table row per form', () => {
    render(<FormsResults s={makeState({ view: 'list', rows: forms })} context={personal} />);
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(3);
  });

  it('list view sorts via headers, marks the active sort, and routes to toggleSort', async () => {
    const s = makeState({ view: 'list', rows: forms, sort: { key: 'title', dir: 'asc' } });
    render(<FormsResults s={s} context={personal} />);
    expect(screen.getByRole('columnheader', { name: /Form Title/ })).toHaveAttribute('aria-sort', 'ascending');
    await userEvent.click(screen.getByRole('button', { name: /Responses/ }));
    expect(s.toggleSort).toHaveBeenCalledWith('responses');
  });

  it('the Pinned tab keeps server order: no sort buttons', () => {
    render(<FormsResults s={makeState({ view: 'list', rows: forms, onPinnedTab: true })} context={personal} />);
    expect(screen.queryByRole('button', { name: /Form Title/ })).not.toBeInTheDocument();
  });

  it('clicking a row opens-or-selects it', () => {
    const s = makeState({ view: 'list', rows: forms });
    render(<FormsResults s={s} context={personal} />);
    fireEvent.click(screen.getByText('Beta').closest('tr')!);
    expect(s.openOrSelect).toHaveBeenCalledWith(forms[1]);
  });

  it('double-click selects the row and cancels the pending open timer', () => {
    const timer = setTimeout(() => {}, 100000);
    const s = makeState({ view: 'list', rows: forms, openTimer: { current: timer } });
    render(<FormsResults s={s} context={personal} />);
    fireEvent.doubleClick(screen.getAllByRole('row')[1]);
    expect(s.toggleSelected).toHaveBeenCalledWith('a');
  });

  it('double-click does nothing for roles that cannot delete', () => {
    const s = makeState({ view: 'list', rows: forms, canDelete: false });
    render(<FormsResults s={s} context={personal} />);
    fireEvent.doubleClick(screen.getAllByRole('row')[1]);
    expect(s.toggleSelected).not.toHaveBeenCalled();
  });

  it('list view with no rows shows the filtered empty state inside the table', () => {
    render(<FormsResults s={makeState({ view: 'list', rows: [] })} context={personal} />);
    expect(screen.getByText('No forms yet')).toBeInTheDocument();
  });

  it('grid view renders a card per form linking to its overview (with ?ws= in a workspace)', () => {
    render(<FormsResults s={makeState({ view: 'grid', rows: forms, maxResponses: 5 })} context={{ type: 'workspace', workspaceId: 'w1' }} />);
    expect(screen.getByRole('link', { name: 'Alpha' })).toHaveAttribute('href', '/forms/a/overview?ws=w1');
    expect(screen.getByRole('button', { name: 'Pin Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Actions for Beta' })).toBeInTheDocument();
  });

  it('grid view shows eight skeleton tiles (two full rows of the four-across grid) while loading', () => {
    const { container } = render(<FormsResults s={makeState({ view: 'grid', isLoading: true })} context={personal} />);
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(8);
  });

  it('grid view with no rows shows the empty state', () => {
    render(<FormsResults s={makeState({ view: 'grid', rows: [] })} context={personal} />);
    expect(screen.getByText('No forms yet')).toBeInTheDocument();
  });

  it('grid view omits the pin button on the Archived tab', () => {
    render(<FormsResults s={makeState({ view: 'grid', rows: forms, onArchivedTab: true })} context={personal} />);
    expect(screen.queryByRole('button', { name: /^Pin / })).not.toBeInTheDocument();
  });
});
