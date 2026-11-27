/**
 * Tests: Menu — open/close, item selection, outside click, Escape
 */

import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Menu, menuChoices } from '@/components/ui/Menu';

const items = [
  { id: 'edit', label: 'Edit', onSelect: vi.fn() },
  { id: 'delete', label: 'Delete', onSelect: vi.fn(), danger: true },
];

describe('Menu component', () => {
  it('is closed by default and opens on trigger click', async () => {
    const user = userEvent.setup();
    render(<Menu trigger="Actions" triggerLabel="Actions menu" items={items} />);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Actions menu' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('calls onSelect and closes when an item is clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <Menu
        trigger="Actions"
        triggerLabel="Actions menu"
        items={[{ id: 'edit', label: 'Edit', onSelect }]}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Actions menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on Escape and refocuses the trigger', async () => {
    const user = userEvent.setup();
    render(<Menu trigger="Actions" triggerLabel="Actions menu" items={items} />);
    const trigger = screen.getByRole('button', { name: 'Actions menu' });
    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('does not call onSelect for a disabled item', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <Menu
        trigger="Actions"
        triggerLabel="Actions menu"
        items={[{ id: 'edit', label: 'Edit', onSelect, disabled: true }]}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Actions menu' }));
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('a heading is a label between items: not a menu item, skipped by the arrow keys', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <Menu
        trigger="Actions"
        triggerLabel="Actions menu"
        items={[
          { id: 'h', label: 'My views', heading: true, onSelect },
          { id: 'a', label: 'First', onSelect },
          { id: 'b', label: 'Second', onSelect },
        ]}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Actions menu' }));
    expect(screen.getByText('My views')).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem').map((el) => el.textContent)).toEqual(['First', 'Second']);
    expect(screen.getByRole('menuitem', { name: 'First' })).toHaveFocus();
    await user.click(screen.getByText('My views'));
    expect(onSelect).not.toHaveBeenCalled();
  });
});

describe('Menu: the one format', () => {
  const noop = () => {};

  it('without a trigger shows the three-dot button', () => {
    render(<Menu triggerLabel="More" items={[{ id: 'a', label: 'Edit', onSelect: noop }]} />);
    expect(screen.getByRole('button', { name: 'More' }).querySelector('svg.lucide-ellipsis-vertical')).not.toBeNull();
  });

  it('ticks the current choice, titles the group and lines off destructive actions', async () => {
    const user = userEvent.setup();
    const onSize = vi.fn();
    render(
      <Menu
        triggerLabel="More"
        items={[
          ...menuChoices('Size', [{ value: 's', label: 'Small' }, { value: 'l', label: 'Large' }], 's', onSize),
          { id: 'remove', label: 'Remove', danger: true, onSelect: noop },
        ]}
      />
    );
    await user.click(screen.getByRole('button', { name: 'More' }));
    expect(screen.getByText('Size')).toBeInTheDocument();
    expect(screen.getByRole('menuitemradio', { name: 'Small' })).toBeChecked();
    expect(screen.getByRole('menuitemradio', { name: 'Small' }).querySelector('svg')).not.toBeNull();
    expect(screen.getByRole('menuitemradio', { name: 'Large' })).not.toBeChecked();
    expect(screen.getByRole('menuitemradio', { name: 'Large' }).querySelector('svg')).toBeNull();
    expect(screen.getAllByRole('separator')).toHaveLength(1);
    await user.click(screen.getByRole('menuitemradio', { name: 'Large' }));
    expect(onSize).toHaveBeenCalledWith('l');
  });
});


describe('Menu and scrolling', () => {
  it('stays open while its own list scrolls, and closes when the page scrolls', async () => {
    const user = userEvent.setup();
    render(<Menu triggerLabel="Types" items={items} />);
    await user.click(screen.getByRole('button', { name: 'Types' }));
    fireEvent.scroll(screen.getByRole('menu'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.scroll(window);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});

describe('Menu with a search box', () => {
  const pick = vi.fn();
  const choices = [
    { id: 'text', label: 'Text', heading: true, onSelect: () => {} },
    { id: 'short', label: 'Short Text', selected: true, onSelect: () => pick('short') },
    { id: 'mail', label: 'Email', selected: false, onSelect: () => pick('mail') },
    { id: 'time', label: 'Date & time', heading: true, onSelect: () => {} },
    { id: 'day', label: 'Date', selected: false, onSelect: () => pick('day') },
    { id: 'clock', label: 'Time', selected: false, onSelect: () => pick('clock') },
  ];
  const open = async () => {
    const user = userEvent.setup();
    render(<Menu triggerLabel="Types" search="Search types" items={choices} />);
    await user.click(screen.getByRole('button', { name: 'Types' }));
    return user;
  };

  it('opens on the search box and narrows the items, keeping only headings with a match', async () => {
    const user = await open();
    expect(screen.getByRole('searchbox', { name: 'Search types' })).toHaveFocus();
    expect(screen.getAllByRole('menuitemradio')).toHaveLength(4);
    await user.keyboard('mail');
    expect(screen.getAllByRole('menuitemradio').map((i) => i.textContent)).toEqual(['Email']);
    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.queryByText('Date & time')).not.toBeInTheDocument();
  });

  it('a group name finds the whole group', async () => {
    const user = await open();
    await user.keyboard('date &');
    expect(screen.getAllByRole('menuitemradio').map((i) => i.textContent)).toEqual(['Date', 'Time']);
  });

  it('Enter picks the first match, and nothing while the box is empty', async () => {
    const user = await open();
    await user.keyboard('{Enter}');
    expect(pick).not.toHaveBeenCalled();
    await user.keyboard('tim{Enter}');
    expect(pick).toHaveBeenLastCalledWith('day');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('arrows move from the box into the list, and typing goes back to the box', async () => {
    const user = await open();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitemradio', { name: 'Short Text' })).toHaveFocus();
    await user.keyboard('e');
    expect(screen.getByRole('searchbox')).toHaveFocus();
  });

  it('says when nothing matches', async () => {
    const user = await open();
    await user.keyboard('zzz');
    expect(screen.getByRole('status')).toHaveTextContent('Nothing matches “zzz”.');
    expect(screen.queryByRole('menuitemradio')).not.toBeInTheDocument();
  });
});
