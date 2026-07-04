/**
 * __tests__/Footer.test.tsx
 * Feature: sprint-1-frontend-auth
 * Tests: Footer — copyright year is current year, links present
 * Requirements: 0.25, 0.26
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Footer from '@/components/landing/Footer';

// next/link renders as a standard <a> tag in test environment
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('Footer component', () => {
  it('renders the brand name', () => {
    render(<Footer />);
    expect(screen.getAllByText(/beginso/i).length).toBeGreaterThan(0);
  });

  it('displays the current year in the copyright notice', () => {
    render(<Footer />);
    const currentYear = new Date().getFullYear().toString();
    expect(screen.getByText(new RegExp(currentYear))).toBeInTheDocument();
  });

  it('renders Privacy Policy link', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: /privacy policy/i })).toBeInTheDocument();
  });

  it('renders Terms of Service link', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: /terms of service/i })).toBeInTheDocument();
  });

  it('renders Contact link', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: /contact/i })).toBeInTheDocument();
  });
});
