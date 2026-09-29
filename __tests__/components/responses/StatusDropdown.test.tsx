/**
 * __tests__/components/responses/StatusDropdown.test.tsx
 * sprint-12-inbox-collaboration, requirements.md §7.1 (1.1) — the fixed status union this
 * dropdown validated against is gone; it now picks a workspace stage from data (task 1.3's own
 * compile-fix note). Behaviour (keyboard nav, Escape isolation, disabled) is unchanged.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusDropdown } from '@/components/responses/StatusDropdown';
import type { StageRef } from '@/types/stage';

const STAGES: StageRef[] = [
  { id: 's-new', name: 'New', colour: 'info', category: 'new' },
  { id: 's-progress', name: 'In Progress', colour: 'warning', category: 'in_progress' },
  { id: 's-completed', name: 'Completed', colour: 'success', category: 'completed' },
];

describe('StatusDropdown', () => {
  it('renders the current stage name on the trigger and all stage options when opened', async () => {
    const user = userEvent.setup();
    render(<StatusDropdown stages={STAGES} currentStageId="s-progress" onChange={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: 'Response stage' });
    expect(trigger).toHaveTextContent('In Progress');

    await user.click(trigger);
    expect(screen.getByRole('option', { name: /New/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /In Progress/ })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /Completed/ })).toBeInTheDocument();
  });

  it('fires onChange with the newly selected stage id and closes the menu', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatusDropdown stages={STAGES} currentStageId="s-new" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Response stage' }));
    await user.click(screen.getByRole('option', { name: /Completed/ }));

    expect(onChange).toHaveBeenCalledWith('s-completed');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('does not fire onChange when re-selecting the already-current stage', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatusDropdown stages={STAGES} currentStageId="s-new" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Response stage' }));
    await user.click(screen.getByRole('option', { name: /New/ }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('renders "Unknown stage" when currentStageId matches nothing, never throws', () => {
    render(<StatusDropdown stages={STAGES} currentStageId="does-not-exist" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Response stage' })).toHaveTextContent('Unknown stage');
  });

  it('disables the trigger when disabled is true', () => {
    render(<StatusDropdown stages={STAGES} currentStageId="s-new" onChange={vi.fn()} disabled />);
    expect(screen.getByRole('button', { name: 'Response stage' })).toBeDisabled();
  });

  it('renders nothing when there are no stages yet, rather than an empty/broken control', () => {
    const { container } = render(<StatusDropdown stages={[]} currentStageId="" onChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('closes the menu on Escape without letting it bubble to an ancestor listener', async () => {
    const user = userEvent.setup();
    const outerHandler = vi.fn();
    render(
      <div onKeyDown={outerHandler}>
        <StatusDropdown stages={STAGES} currentStageId="s-new" onChange={vi.fn()} />
      </div>
    );

    await user.click(screen.getByRole('button', { name: 'Response stage' }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(outerHandler).not.toHaveBeenCalled();
  });

  it('supports Arrow, Home, and End navigation through listbox options', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatusDropdown stages={STAGES} currentStageId="s-new" onChange={onChange} />);

    const trigger = screen.getByRole('button', { name: 'Response stage' });
    trigger.focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: /New/ })).toHaveFocus();

    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('option', { name: /In Progress/ })).toHaveFocus();
    await user.keyboard('{End}');
    expect(screen.getByRole('option', { name: /Completed/ })).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByRole('option', { name: /New/ })).toHaveFocus();
    await user.keyboard('{ArrowUp}{Enter}');

    expect(onChange).toHaveBeenCalledWith('s-completed');
    expect(trigger).toHaveFocus();
  });

  it('uses 44px touch targets while keeping the compact type scale', async () => {
    const user = userEvent.setup();
    render(<StatusDropdown stages={STAGES} currentStageId="s-new" onChange={vi.fn()} />);

    const trigger = screen.getByRole('button', { name: 'Response stage' });
    expect(trigger).toHaveClass('min-h-11', 'min-w-11');
    await user.click(trigger);
    screen.getAllByRole('option').forEach((option) => {
      expect(option).toHaveClass('min-h-11', 'text-[11px]');
    });
  });
});
