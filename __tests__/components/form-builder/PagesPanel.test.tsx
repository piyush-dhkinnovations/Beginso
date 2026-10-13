import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PagesPanel, PageSwitcher } from '@/components/form-builder/PagesPanel';

const pages = [
  { id: 'p1', order: 0, title: 'Intro' },
  { id: 'p2', order: 1 },
];

function setup(over: Partial<React.ComponentProps<typeof PagesPanel>> = {}) {
  const props = { pages, activePageId: 'p1', fieldCounts: { p1: 2 }, onSelectPage: vi.fn(), onAddPage: vi.fn(), onDeletePage: vi.fn(), ...over };
  render(<PagesPanel {...props} />);
  return props;
}

describe('PagesPanel', () => {
  it('shows one numbered tile per page with a title tooltip of page name and field count', () => {
    setup();
    expect(screen.getByTitle('Intro — 2 fields')).toBeInTheDocument();
    expect(screen.getByTitle('Untitled form — 0 fields')).toBeInTheDocument();
  });

  it('uses the singular "field" for exactly one', () => {
    setup({ fieldCounts: { p1: 1 } });
    expect(screen.getByTitle('Intro — 1 field')).toBeInTheDocument();
  });

  it('clicking or pressing Enter/Space on a tile selects it', async () => {
    const p = setup();
    const tile = screen.getByTitle('Untitled form — 0 fields');
    await userEvent.click(tile);
    expect(p.onSelectPage).toHaveBeenLastCalledWith('p2');
    tile.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(p.onSelectPage).toHaveBeenCalledTimes(3);
  });

  it('delete button deletes that page without selecting it', async () => {
    const p = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Delete page 2' }));
    expect(p.onDeletePage).toHaveBeenCalledWith('p2');
    expect(p.onSelectPage).not.toHaveBeenCalled();
  });

  it('a lone page cannot be deleted', () => {
    setup({ pages: [pages[0]] });
    expect(screen.queryByRole('button', { name: /Delete page/ })).not.toBeInTheDocument();
  });

  it('Add page appends', async () => {
    const p = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Add page' }));
    expect(p.onAddPage).toHaveBeenCalledTimes(1);
  });
});

describe('PageSwitcher', () => {
  it('lists Page 1..n with the active one pressed and selects on click', async () => {
    const onSelectPage = vi.fn();
    render(<PageSwitcher pages={pages} activePageId="p2" onSelectPage={onSelectPage} />);
    const group = screen.getByRole('group', { name: 'Pages' });
    expect(within(group).getByRole('button', { name: 'Page 2' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(group).getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(within(group).getByRole('button', { name: 'Page 1' }));
    expect(onSelectPage).toHaveBeenCalledWith('p1');
  });

  it('hides the switcher for a single page but still explains structure editing is desktop-only', () => {
    render(<PageSwitcher pages={[pages[0]]} activePageId="p1" onSelectPage={vi.fn()} />);
    expect(screen.queryByRole('group', { name: 'Pages' })).not.toBeInTheDocument();
    expect(screen.getByText('Page structure is edited on a larger screen.')).toBeInTheDocument();
  });
});
