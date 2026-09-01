/**
 * __tests__/components/ui/StatCard.test.tsx
 * Feature: sprint-7-foundation
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '@/components/ui/StatCard';

describe('StatCard component', () => {
  it('renders label and value', () => {
    render(<StatCard label="Total Responses" value={154} />);
    expect(screen.getByText('Total Responses')).toBeInTheDocument();
    expect(screen.getByText('154')).toBeInTheDocument();
  });

  it('renders a delta with its direction class', () => {
    render(<StatCard label="Responses" value={10} delta={{ label: '+12%', direction: 'up' }} />);
    const delta = screen.getByText('+12%');
    expect(delta.className).toMatch(/bg-delta-up/);
  });

  it('applies the horizontal variant class when requested', () => {
    const { container } = render(<StatCard label="Responses" value={10} horizontal />);
    expect(container.firstElementChild?.className).toMatch(/bg-stat-h/);
  });
});
