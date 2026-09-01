/**
 * __tests__/components/ui/Badge.test.tsx
 * Feature: sprint-7-foundation
 * Tests: generic Badge primitive — variant/pill/size classes, optional dot
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge } from '@/components/ui/Badge';

describe('Badge component', () => {
  it('renders children with the base class', () => {
    render(<Badge>New</Badge>);
    const el = screen.getByText('New');
    expect(el.className).toMatch(/\bbg-badge\b/);
  });

  it('applies the variant class', () => {
    render(<Badge variant="success">Live</Badge>);
    expect(screen.getByText('Live').className).toMatch(/bg-badge-success/);
  });

  it('applies pill and lg-size classes when requested', () => {
    render(
      <Badge pill size="lg">
        Beta
      </Badge>
    );
    const el = screen.getByText('Beta');
    expect(el.className).toMatch(/bg-badge-pill/);
    expect(el.className).toMatch(/bg-badge-lg/);
  });

  it('renders a leading dot when dot is set', () => {
    render(<Badge dot>Active</Badge>);
    const el = screen.getByText('Active');
    expect(el.querySelector('.bg-badge-dot')).toBeInTheDocument();
  });
});
