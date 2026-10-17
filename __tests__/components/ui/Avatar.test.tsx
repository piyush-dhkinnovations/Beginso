/**
 * __tests__/components/ui/Avatar.test.tsx
 * Feature: sprint-7-foundation
 * Tests: Avatar — initials fallback, image rendering, size class
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from '@/components/ui/Avatar';

describe('Avatar component', () => {
  it('renders initials from a two-word name when no src is given', () => {
    render(<Avatar name="Priya Sharma" />);
    expect(screen.getByText('PS')).toBeInTheDocument();
  });

  it('renders a single initial for a one-word name', () => {
    render(<Avatar name="Cher" />);
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('renders an image when src is given, not initials', () => {
    render(<Avatar name="Priya Sharma" src="/avatar.jpg" />);
    expect(screen.queryByText('PS')).not.toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('src', '/avatar.jpg');
  });

  it('applies the requested size class', () => {
    const { container } = render(<Avatar name="Priya Sharma" size="lg" />);
    expect(container.firstElementChild?.className).toMatch(/bg-avatar-lg/);
  });

  it('shows a development-origin avatar by its path (the live site blocks http://localhost)', () => {
    render(<Avatar name="Priya Sharma" src="http://localhost:3000/avatars/01.svg" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/avatars/01.svg');
  });
});
