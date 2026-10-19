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

  it('gives initials a colour of their own, the same for the same person (QA: every respondent avatar was the same blue)', () => {
    const { container, rerender } = render(<Avatar name="Harsh Vora" />);
    const first = container.firstElementChild as HTMLElement;
    expect(first.getAttribute('data-tone')).toBe('auto');
    const hue = first.style.getPropertyValue('--av-h');
    expect(hue).not.toBe('');
    rerender(<Avatar name="Harsh Vora" />);
    expect((container.firstElementChild as HTMLElement).style.getPropertyValue('--av-h')).toBe(hue);
  });

  it('different people get different colours', () => {
    const hueOf = (name: string) => {
      const { container, unmount } = render(<Avatar name={name} />);
      const v = (container.firstElementChild as HTMLElement).style.getPropertyValue('--av-h');
      unmount();
      return v;
    };
    const hues = new Set(['Harsh Vora', 'Gerald Gray', 'Ratin Mehta', 'Afzal Shaikh', 'Jayesh Patel', 'Piyush Prajapat'].map(hueOf));
    expect(hues.size).toBeGreaterThan(2);
  });

  it('stays plain when asked, when there is a photo, and when there is no name', () => {
    const plain = render(<Avatar name="Harsh Vora" tone="plain" />);
    expect(plain.container.firstElementChild).not.toHaveAttribute('data-tone');
    plain.unmount();
    const photo = render(<Avatar name="Harsh Vora" src="/a.jpg" />);
    expect(photo.container.firstElementChild).not.toHaveAttribute('data-tone');
    photo.unmount();
    const anon = render(<Avatar />);
    expect(anon.container.firstElementChild).not.toHaveAttribute('data-tone');
  });
});
