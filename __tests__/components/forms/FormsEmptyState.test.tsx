import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateFormButton, FormsEmptyFiltered, FormsFirstRunEmpty } from '@/components/forms/FormsEmptyState';
import { makeState } from './formsTestUtils';

describe('FormsFirstRunEmpty', () => {
  it('invites creating the first form and starts creation on click', async () => {
    const s = makeState();
    render(<FormsFirstRunEmpty s={s} />);
    expect(screen.getByText('No forms yet')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Create Form/ }));
    expect(s.startCreate).toHaveBeenCalledTimes(1);
  });

  it('hides the create button for roles that cannot create', () => {
    render(<FormsFirstRunEmpty s={makeState({ canCreate: false })} />);
    expect(screen.getByText('No forms yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Create Form/ })).not.toBeInTheDocument();
  });
});

describe('CreateFormButton', () => {
  it('fires onClick', async () => {
    const onClick = vi.fn();
    render(<CreateFormButton onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: /Create Form/ }));
    expect(onClick).toHaveBeenCalled();
  });
});

describe('FormsEmptyFiltered', () => {
  it('Pinned tab with no search explains pinning and routes back to Recent', async () => {
    const s = makeState({ onPinnedTab: true });
    render(<FormsEmptyFiltered s={s} />);
    expect(screen.getByText('No pinned forms yet')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Go to Recent' }));
    expect(s.handleTabChange).toHaveBeenCalledWith('recent');
  });

  it('Pinned tab with a search says nothing matched', () => {
    render(<FormsEmptyFiltered s={makeState({ onPinnedTab: true, search: 'zz' })} />);
    expect(screen.getByText('No matching pinned forms')).toBeInTheDocument();
  });

  it('Archived tab without a search is never "first run"; offers Go to Forms and Create Form', async () => {
    const s = makeState({ onArchivedTab: true });
    render(<FormsEmptyFiltered s={s} />);
    expect(screen.getByText('No archived forms')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Go to Forms' }));
    expect(s.handleTabChange).toHaveBeenCalledWith('recent');
    await userEvent.click(screen.getByRole('button', { name: /Create Form/ }));
    expect(s.startCreate).toHaveBeenCalled();
  });

  it('Archived tab omits the secondary Create Form when the role cannot create', () => {
    render(<FormsEmptyFiltered s={makeState({ onArchivedTab: true, canCreate: false })} />);
    expect(screen.queryByRole('button', { name: /Create Form/ })).not.toBeInTheDocument();
  });

  it('a search with no hits names the query, counts the other forms and clears on click', async () => {
    const s = makeState({ search: 'tax', allCount: 5 });
    render(<FormsEmptyFiltered s={s} />);
    expect(screen.getByText('No forms match "tax"')).toBeInTheDocument();
    expect(screen.getByText('There are 5 other forms.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Clear filter' }));
    expect(s.setSearch).toHaveBeenCalledWith('');
    expect(s.handleTabChange).toHaveBeenCalledWith('recent');
  });

  it('uses the singular phrase for exactly one hidden form', () => {
    render(<FormsEmptyFiltered s={makeState({ search: 'tax', allCount: 1 })} />);
    expect(screen.getByText('There is 1 other form.')).toBeInTheDocument();
  });

  it('a status filter is named in lower case, with no description when nothing else exists', () => {
    render(<FormsEmptyFiltered s={makeState({ status: 'closed', allCount: 0 })} />);
    expect(screen.getByText('No closed forms')).toBeInTheDocument();
    expect(screen.queryByText(/other form/)).not.toBeInTheDocument();
  });

  it('with no filter at all it falls back to the first-run copy', () => {
    render(<FormsEmptyFiltered s={makeState()} />);
    expect(screen.getByText('No forms yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Form/ })).toBeInTheDocument();
  });
});
