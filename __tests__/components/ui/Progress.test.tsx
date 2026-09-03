/**
 * __tests__/components/ui/Progress.test.tsx
 * Feature: sprint-7-foundation
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Progress } from '@/components/ui/Progress';

describe('Progress component', () => {
  it('exposes value/min/max via role="progressbar" and applies the variant class', () => {
    render(<Progress value={30} max={50} variant="success" label="Uploading" />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '30');
    expect(bar).toHaveAttribute('aria-valuemax', '50');
    expect(bar.className).toMatch(/bg-progress-success/);
    expect(screen.getByText('60%')).toBeInTheDocument();
  });
});
