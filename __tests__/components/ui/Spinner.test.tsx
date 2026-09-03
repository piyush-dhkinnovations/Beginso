/**
 * __tests__/components/ui/Spinner.test.tsx
 * Feature: sprint-7-foundation
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Spinner } from '@/components/ui/Spinner';

describe('Spinner component', () => {
  it('renders as role="status" and applies the large size variant', () => {
    render(<Spinner size="large" label="Loading responses" />);
    const el = screen.getByRole('status', { name: 'Loading responses' });
    expect(el.className).toMatch(/bg-spinner-lg/);
  });
});
