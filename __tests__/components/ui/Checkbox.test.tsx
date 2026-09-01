/**
 * __tests__/components/ui/Checkbox.test.tsx
 * Feature: sprint-7-foundation
 * Tests: Checkbox — toggles, renders label/description wrapper, works without a label
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Checkbox } from '@/components/ui/Checkbox';

describe('Checkbox component', () => {
  it('renders as a plain input with no label', () => {
    render(<Checkbox id="terms" />);
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
    expect(screen.queryByText('terms')).not.toBeInTheDocument();
  });

  it('renders label and description text when provided', () => {
    render(<Checkbox id="terms" label="Accept terms" description="Required to continue" />);
    expect(screen.getByLabelText(/accept terms/i)).toBeInTheDocument();
    expect(screen.getByText('Required to continue')).toBeInTheDocument();
  });

  it('toggles on click and fires onChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox id="terms" label="Accept" onChange={onChange} />);
    await user.click(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledOnce();
  });

  it('does not toggle when disabled', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox id="terms" disabled onChange={onChange} />);
    await user.click(screen.getByRole('checkbox'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
