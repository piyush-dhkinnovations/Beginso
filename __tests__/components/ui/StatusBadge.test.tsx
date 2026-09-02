/**
 * __tests__/components/ui/StatusBadge.test.tsx
 * Feature: sprint-7-foundation (rename coverage — behavior carried over unchanged from the
 * former src/components/ui/Badge.tsx)
 * Tests: StatusBadge — renders text, truncates long text, applies per-status color tokens
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '@/components/ui/StatusBadge';

describe('StatusBadge component', () => {
  it('renders its text', () => {
    render(<StatusBadge variant="draft">Draft</StatusBadge>);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('truncates text longer than 30 characters', () => {
    const longText = 'a'.repeat(40);
    render(<StatusBadge variant="active">{longText}</StatusBadge>);
    expect(screen.getByText(`${'a'.repeat(30)}...`)).toBeInTheDocument();
  });

  it('applies the matching V1 status-color token classes', () => {
    render(<StatusBadge variant="closed">Closed</StatusBadge>);
    const el = screen.getByText('Closed');
    expect(el.className).toMatch(/bg-status-closed-bg/);
  });
});
