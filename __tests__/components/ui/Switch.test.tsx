/**
 * __tests__/components/ui/Switch.test.tsx
 * Feature: sprint-7-foundation
 * Tests: Switch — native checkbox semantics, checked/onChange(boolean) API preserved
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from '@/components/ui/Switch';

describe('Switch component', () => {
  it('renders a native checkbox with role="switch"', () => {
    render(<Switch id="notify" checked={false} onChange={() => {}} />);
    const el = screen.getByRole('switch');
    expect(el.tagName).toBe('INPUT');
    expect(el).toHaveAttribute('type', 'checkbox');
  });

  it('reflects the checked prop, including the explicit aria-checked attribute', () => {
    render(<Switch id="notify" checked onChange={() => {}} />);
    const el = screen.getByRole('switch');
    expect(el).toBeChecked();
    expect(el).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onChange with the new boolean value on toggle', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Switch id="notify" checked={false} onChange={onChange} />);
    await user.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('applies the beginso-ui.css switch class and forwards a ref', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Switch id="notify" checked={false} onChange={() => {}} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
    expect(screen.getByRole('switch').className).toMatch(/\bbg-switch\b/);
  });
});
