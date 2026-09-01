/**
 * __tests__/components/ui/Card.test.tsx
 * Feature: sprint-7-foundation
 * Tests: Card — renders children, base/padded classes, className passthrough
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from '@/components/ui/Card';

describe('Card component', () => {
  it('renders children with the base class', () => {
    render(<Card>Content</Card>);
    const el = screen.getByText('Content');
    expect(el.className).toMatch(/\bbg-card\b/);
  });

  it('applies bg-card-pad by default', () => {
    render(<Card>Content</Card>);
    expect(screen.getByText('Content').className).toMatch(/bg-card-pad/);
  });

  it('omits bg-card-pad when padded is false', () => {
    render(<Card padded={false}>Content</Card>);
    expect(screen.getByText('Content').className).not.toMatch(/bg-card-pad/);
  });

  it('keeps a consumer className alongside the base classes', () => {
    render(<Card className="p-8 flex flex-col gap-6">Content</Card>);
    const el = screen.getByText('Content');
    expect(el.className).toMatch(/\bbg-card\b/);
    expect(el.className).toMatch(/p-8/);
  });
});
