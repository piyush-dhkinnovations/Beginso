/**
 * __tests__/Input.test.tsx
 * Feature: sprint-1-frontend-auth
 * Tests: Input component — disabled rejects input, error displays, label renders
 * Requirements: 3.2, 3.9, 15.5
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from '@/components/ui/Input';

describe('Input component', () => {
  it('renders with a label when label prop is provided', () => {
    render(<Input id="email" label="Email address" />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  it('renders a placeholder', () => {
    render(<Input id="pw" placeholder="Enter password" />);
    expect(screen.getByPlaceholderText(/enter password/i)).toBeInTheDocument();
  });

  it('shows error message in role="alert" element', () => {
    render(<Input id="email" error="Invalid email" />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Invalid email');
  });

  it('does not render an alert element when no error', () => {
    render(<Input id="email" />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('rejects keyboard input when disabled', async () => {
    const user = userEvent.setup();
    render(<Input id="name" disabled />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.type(input, 'hello');
    // pointer-events-none + disabled means value stays empty
    expect(input.value).toBe('');
  });

  it('is marked disabled on the DOM element', () => {
    render(<Input id="pw" disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('accepts normal typing when not disabled', async () => {
    const user = userEvent.setup();
    render(<Input id="name" />);
    const input = screen.getByRole('textbox') as HTMLInputElement;
    await user.type(input, 'Piyush');
    expect(input.value).toBe('Piyush');
  });

  it('renders password field with type="password"', () => {
    render(<Input id="pw" type="password" />);
    const input = document.querySelector('input[type="password"]');
    expect(input).toBeInTheDocument();
  });
});
