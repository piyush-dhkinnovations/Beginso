/**
 * __tests__/components/form-builder/OptionsEditor.test.tsx
 * Feature: sprint-2-part-2-form-builder-completion
 * Tests: OptionsEditor — add/delete/edit call onUpdate with the right values,
 *   last-option delete is disabled, new option input auto-focuses
 * Requirements: 2.1-2.7
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OptionsEditor } from '@/components/form-builder/OptionsEditor';

describe('OptionsEditor', () => {
  it('renders one input per option', () => {
    render(<OptionsEditor fieldId="f1" options={['A', 'B']} onUpdate={vi.fn()} />);
    expect(screen.getByDisplayValue('A')).toBeInTheDocument();
    expect(screen.getByDisplayValue('B')).toBeInTheDocument();
  });

  it('disables delete when only one option remains', () => {
    render(<OptionsEditor fieldId="f1" options={['A']} onUpdate={vi.fn()} />);
    expect(screen.getByRole('button', { name: /delete option/i })).toBeDisabled();
  });

  it('enables delete with 2+ options and removes the clicked one on click', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<OptionsEditor fieldId="f1" options={['A', 'B']} onUpdate={onUpdate} />);
    const deleteButtons = screen.getAllByRole('button', { name: /delete option/i });
    await user.click(deleteButtons[0]);
    expect(onUpdate).toHaveBeenCalledWith('f1', ['B']);
  });

  it('adds a new option with default label and focuses it', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<OptionsEditor fieldId="f1" options={['A']} onUpdate={onUpdate} />);
    await user.click(screen.getByRole('button', { name: /add option/i }));
    expect(onUpdate).toHaveBeenCalledWith('f1', ['A', 'Option 2']);
    expect(screen.getByDisplayValue('Option 2')).toHaveFocus();
  });

  it('commits an edited option value on blur', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<OptionsEditor fieldId="f1" options={['A', 'B']} onUpdate={onUpdate} />);
    const input = screen.getByDisplayValue('A');
    await user.clear(input);
    await user.type(input, 'Renamed');
    await user.tab();
    expect(onUpdate).toHaveBeenCalledWith('f1', ['Renamed', 'B']);
  });
});
