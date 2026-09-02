/**
 * __tests__/components/ui/Select.test.tsx
 * Feature: sprint-7-foundation
 * Tests: Select — renders options, label association, error state
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from '@/components/ui/Select';

describe('Select component', () => {
  it('renders with a label and options, and selects a value', async () => {
    const user = userEvent.setup();
    render(
      <Select id="role" label="Role">
        <option value="editor">Editor</option>
        <option value="reviewer">Reviewer</option>
      </Select>
    );
    const select = screen.getByLabelText('Role') as HTMLSelectElement;
    await user.selectOptions(select, 'reviewer');
    expect(select.value).toBe('reviewer');
  });

  it('shows error message in a role="alert" element', () => {
    render(
      <Select id="role" error="Pick a role">
        <option value="">Choose...</option>
      </Select>
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Pick a role');
  });

  it('applies the beginso-ui.css select class', () => {
    render(
      <Select id="role">
        <option value="a">A</option>
      </Select>
    );
    expect(screen.getByRole('combobox').className).toMatch(/\bbg-select\b/);
  });
});
