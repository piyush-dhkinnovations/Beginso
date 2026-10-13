import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RouteLoading } from '@/components/errors/RouteLoading';

describe('RouteLoading', () => {
  it('is a polite busy status with screen-reader text', () => {
    render(<RouteLoading />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(screen.getByText('Loading…')).toHaveClass('sr-only');
  });
});
