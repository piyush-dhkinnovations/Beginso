import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PageSwitcher, type PageSwitcherProps } from '@/components/form-builder/PagesPanel';

const pages = [
  { id: 'p1', order: 0, title: 'Intro' },
  { id: 'p2', order: 1 },
];

function setup(over: Partial<PageSwitcherProps> = {}) {
  const props = { pages, activePageId: 'p1', fieldCounts: { p1: 2 }, onSelectPage: vi.fn(), onAddPage: vi.fn(), onDeletePage: vi.fn(), ...over };
  render(<PageSwitcher {...props} />);
  return props;
}

const group = () => screen.getByRole('group', { name: 'Pages' });

describe('PageSwitcher', () => {
  it('shows one button per page, with a tooltip of name and field count', () => {
    setup();
    expect(within(group()).getByRole('button', { name: 'Intro' })).toHaveAttribute('title', 'Intro — 2 fields');
    expect(within(group()).getByRole('button', { name: 'Page 2' })).toHaveAttribute('title', 'Untitled form — 0 fields');
  });

  it('a named page reads its name alone; an unnamed one reads its number', () => {
    setup();
    expect(within(group()).getByRole('button', { name: 'Intro' })).toBeInTheDocument();
    expect(screen.queryByText(/Page 1/)).not.toBeInTheDocument();
    expect(within(group()).getByRole('button', { name: 'Page 2' })).toBeInTheDocument();
  });

  it('uses the singular "field" for exactly one, in the tooltip and beside the row', () => {
    setup({ fieldCounts: { p1: 1 } });
    expect(screen.getByTitle('Intro — 1 field')).toBeInTheDocument();
    expect(screen.getByText('1 field')).toBeInTheDocument();
  });

  it('presses the active page and selects another on click or keyboard', async () => {
    const p = setup();
    expect(within(group()).getByRole('button', { name: 'Intro' })).toHaveAttribute('aria-pressed', 'true');
    const second = within(group()).getByRole('button', { name: 'Page 2' });
    expect(second).toHaveAttribute('aria-pressed', 'false');
    await userEvent.click(second);
    second.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(p.onSelectPage).toHaveBeenCalledTimes(3);
    expect(p.onSelectPage).toHaveBeenLastCalledWith('p2');
  });

  it('only the active page carries the X that deletes it', async () => {
    const p = setup({ activePageId: 'p2' });
    expect(screen.queryByRole('button', { name: 'Delete page 1' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete page 2' }));
    expect(p.onDeletePage).toHaveBeenCalledWith('p2');
    expect(p.onSelectPage).not.toHaveBeenCalled();
  });

  it('a lone page cannot be deleted', () => {
    setup({ pages: [pages[0]] });
    expect(screen.queryByRole('button', { name: /Delete page/ })).not.toBeInTheDocument();
  });

  it('Add page appends, even when the form has only one page', async () => {
    const p = setup({ pages: [pages[0]] });
    await userEvent.click(within(group()).getByRole('button', { name: 'Add page' }));
    expect(p.onAddPage).toHaveBeenCalledTimes(1);
  });

  it('still says renaming, deleting and reordering pages need a larger screen', () => {
    setup();
    expect(screen.getByText('Pages can only be renamed, deleted or reordered on a larger screen. You can still edit your questions here.')).toBeInTheDocument();
  });
});
