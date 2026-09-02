/**
 * __tests__/components/ui/Menu.test.tsx
 * Feature: sprint-7-foundation
 * Tests: Menu — open/close, item selection, outside click, Escape
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Menu } from '@/components/ui/Menu';

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
});
