/**
 * __tests__/Button.test.tsx
 * Feature: sprint-1-frontend-auth (behavior) / sprint-7-foundation (beginso-ui.css migration)
 * Tests: Button component — disabled/loading prevent onClick, applies design-system classes
 * Requirements: 3.1, 3.8, 15.5 (sprint-1) · 2.1 (sprint-7)
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/Button';

describe('Button component', () => {
  it('renders children text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('calls onClick when clicked and not disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Click</Button>);
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('does NOT call onClick when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        Click
      </Button>
    );
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does NOT call onClick when isLoading', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <Button isLoading onClick={handleClick}>
        Submit
      </Button>
    );
    const btn = screen.getByRole('button');
    await user.click(btn);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('marks itself busy and applies the design system loading class when isLoading is true', () => {
    render(<Button isLoading>Submit</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).toBeDisabled();
    expect(btn.className).toMatch(/bg-btn-loading/);
  });

  it('applies the beginso-ui.css base and disabled state when disabled', () => {
    render(<Button disabled>Click</Button>);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    expect(btn.className).toMatch(/\bbg-btn\b/);
  });

  it('applies the matching variant and size classes', () => {
    render(
      <Button variant="destructive" size="small">
        Delete
      </Button>
    );
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/bg-btn-danger/);
    expect(btn.className).toMatch(/bg-btn-sm/);
  });
});
