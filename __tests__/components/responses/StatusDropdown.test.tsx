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
    // Reverting to "new" is confirmed working backend-side (BUG-04, verified 06 Aug 2026) —
    // all 3 statuses are freely selectable, no exclusion needed.
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

  it('gives each status a distinctly colored dot on the trigger', () => {
    const { container: newContainer } = render(<StatusDropdown currentStatus="new" onChange={vi.fn()} />);
    expect(newContainer.querySelector('.bg-status-new-dot')).toBeInTheDocument();

    const { container: completedContainer } = render(<StatusDropdown currentStatus="completed" onChange={vi.fn()} />);
    expect(completedContainer.querySelector('.bg-status-active-dot')).toBeInTheDocument();
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
