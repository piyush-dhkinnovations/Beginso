import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HeroSection from '@/components/landing/HeroSection';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock('@/hooks/useReveal', () => ({ useReveal: () => ({ ref: { current: null }, visible: true }) }));
vi.mock('@/components/landing/ProductMockup', () => ({ default: () => null }));

describe('HeroSection', () => {
  // A <button> inside an <a> is invalid HTML and is focused twice with Tab: the calls to action are links styled as buttons.
  it('renders its calls to action as links, never a button inside a link', () => {
    render(<HeroSection />);
    expect(document.querySelectorAll('a button')).toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Create a form' })).toHaveAttribute('href', '/try');
    expect(screen.getByRole('link', { name: 'See how it works' })).toHaveAttribute('href', '#how-it-works');
  });
});
