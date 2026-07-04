/**
 * __tests__/Button.test.tsx
 * Feature: sprint-1-frontend-auth
 * Tests: Button component — disabled prevents onClick, renders loading state
 * Requirements: 3.1, 3.8, 15.5
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '@/components/ui/Button';

// Mock LoadingSpinner to avoid SVG animation complexity in tests
vi.mock('@/components/common/LoadingSpinner', () => ({
  LoadingSpinner: () => <span data-testid="spinner" />,
}));

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

  it('shows LoadingSpinner when isLoading is true', () => {
    render(<Button isLoading>Submit</Button>);
    expect(screen.getByTestId('spinner')).toBeInTheDocument();
  });

  it('applies opacity-60 and cursor-not-allowed classes when disabled', () => {
    render(<Button disabled>Click</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/opacity-60/);
    expect(btn.className).toMatch(/cursor-not-allowed/);
  });

  it('has min-h-[44px] min-w-[44px] touch target classes', () => {
    render(<Button>Touch</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toMatch(/min-h-\[44px\]/);
    expect(btn.className).toMatch(/min-w-\[44px\]/);
  });
});
