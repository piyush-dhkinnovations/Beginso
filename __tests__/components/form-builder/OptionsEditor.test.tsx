/**
 * __tests__/components/form-builder/OptionsEditor.test.tsx
 * Feature: sprint-2-part-2-form-builder-completion
 * Tests: OptionsEditor — add/delete/edit call onUpdate with the right values,
 *   last-option delete is disabled, new option input auto-focuses
 * Requirements: 2.1-2.7
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

  it('commits the last-typed option shortly after typing stops, without needing a blur (QA P0-003)', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<OptionsEditor fieldId="f1" options={['A', 'B']} onUpdate={onUpdate} />);
    await user.type(screen.getByDisplayValue('B'), 'x');
    expect(onUpdate).not.toHaveBeenCalled();
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith('f1', ['A', 'Bx']), { timeout: 2000 });
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('never sends an empty option: it is flagged inline, and saved once filled in (QA A4-002)', async () => {
    const user = userEvent.setup();
    const onUpdate = vi.fn();
    render(<OptionsEditor fieldId="f1" options={['A', 'B']} onUpdate={onUpdate} />);
    const first = screen.getByDisplayValue('A');
    await user.clear(first);
    await user.tab(); // blur: still empty
    expect(onUpdate).not.toHaveBeenCalled();
    expect(first).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('alert')).toHaveTextContent(/An option is empty/);
    await new Promise((r) => setTimeout(r, 800));
    expect(onUpdate).not.toHaveBeenCalled();

    await user.type(first, 'Z');
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith('f1', ['Z', 'B']), { timeout: 2000 });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
