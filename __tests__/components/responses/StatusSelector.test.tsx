/**
 * __tests__/components/responses/StatusSelector.test.tsx
 * Feature: sprint-4-responses
 * Tests: StatusSelector — 3 buttons, active/inactive variants, onChange, disabled, aria-pressed
 * Requirements: 5.1-5.7
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusSelector } from '@/components/responses/StatusSelector';

describe('StatusSelector', () => {
  it('renders 3 buttons', () => {
    render(<StatusSelector currentStatus="new" onChange={vi.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('marks the active status with aria-pressed=true and inactive ones false', () => {
    render(<StatusSelector currentStatus="in_progress" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'New' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'In Progress' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Completed' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('fires onChange with the clicked status', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatusSelector currentStatus="new" onChange={onChange} />);
    await user.click(screen.getByRole('button', { name: 'Completed' }));
    expect(onChange).toHaveBeenCalledWith('completed');
  });

  it('disables all buttons when disabled is true', () => {
    render(<StatusSelector currentStatus="new" onChange={vi.fn()} disabled />);
    screen.getAllByRole('button').forEach((button) => expect(button).toBeDisabled());
  });
});
