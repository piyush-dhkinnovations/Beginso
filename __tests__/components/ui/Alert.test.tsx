/**
 * __tests__/components/ui/Alert.test.tsx
 * Feature: sprint-7-foundation
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Alert } from '@/components/ui/Alert';

describe('Alert component', () => {
  it('renders as role="alert" with the info variant by default', () => {
    render(<Alert>Something to know</Alert>);
    const el = screen.getByRole('alert');
    expect(el.className).toMatch(/bg-alert-info/);
    expect(el).toHaveTextContent('Something to know');
  });

  it('renders an optional title and applies the requested variant', () => {
    render(
      <Alert variant="error" title="Failed">
        Try again
      </Alert>
    );
    const el = screen.getByRole('alert');
    expect(el.className).toMatch(/bg-alert-error/);
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });
});
