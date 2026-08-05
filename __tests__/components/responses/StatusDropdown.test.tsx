/**
 * __tests__/components/responses/StatusDropdown.test.tsx
 * Feature: sprint-4-responses
 * Tests: StatusDropdown — colored pill trigger, option menu, onChange, disabled state,
 * Escape closes the menu without bubbling to a parent (e.g. ResponseDrawer's close-on-Escape)
 * Requirements: 5.2, 5.3
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusDropdown } from '@/components/responses/StatusDropdown';

describe('StatusDropdown', () => {
  it('renders the current status on the trigger and all 3 options when opened', async () => {
    const user = userEvent.setup();
    render(<StatusDropdown currentStatus="in_progress" onChange={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: 'Response status' });
    expect(trigger).toHaveTextContent('In Progress');

    await user.click(trigger);
    expect(screen.getByRole('option', { name: /New/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /In Progress/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Completed/ })).toBeInTheDocument();
  });

  it('fires onChange with the newly selected status and closes the menu', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatusDropdown currentStatus="new" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Response status' }));
    await user.click(screen.getByRole('option', { name: /Completed/ }));

    expect(onChange).toHaveBeenCalledWith('completed');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('does not fire onChange when re-selecting the already-current status', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatusDropdown currentStatus="new" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Response status' }));
    await user.click(screen.getByRole('option', { name: /New/ }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('applies a distinct colored style per status', () => {
    const { rerender } = render(<StatusDropdown currentStatus="new" onChange={vi.fn()} />);
    const newClass = screen.getByRole('button', { name: 'Response status' }).className;
    expect(newClass).toContain('status-new');

    rerender(<StatusDropdown currentStatus="completed" onChange={vi.fn()} />);
    const completedClass = screen.getByRole('button', { name: 'Response status' }).className;
    expect(completedClass).toContain('status-active');
    expect(completedClass).not.toBe(newClass);
  });

  it('disables the trigger when disabled is true', () => {
    render(<StatusDropdown currentStatus="new" onChange={vi.fn()} disabled />);
    expect(screen.getByRole('button', { name: 'Response status' })).toBeDisabled();
  });

  it('closes the menu on Escape without letting it bubble to an ancestor listener', async () => {
    const user = userEvent.setup();
    const outerHandler = vi.fn();
    render(
      <div onKeyDown={outerHandler}>
        <StatusDropdown currentStatus="new" onChange={vi.fn()} />
      </div>
    );

    await user.click(screen.getByRole('button', { name: 'Response status' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(outerHandler).not.toHaveBeenCalled();
  });
});
