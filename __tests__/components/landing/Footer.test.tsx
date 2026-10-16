/**
 * __tests__/Footer.test.tsx
 * Feature: sprint-1-frontend-auth
 * Tests: Footer — copyright year is current year, three link columns present
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

  it('renders the Product, Resources and Legal columns', () => {
    render(<Footer />);
    expect(screen.getByText('Product')).toBeInTheDocument();
    expect(screen.getByText('Resources')).toBeInTheDocument();
    expect(screen.getByText('Legal')).toBeInTheDocument();
  });

  it('renders a working Privacy link', () => {
    render(<Footer />);
    expect(screen.getByRole('link', { name: /privacy/i })).toHaveAttribute('href', '/privacy');
  });

  // /docs, /docs/api, /help, /about and /contact have no page (they 404 in production), so the footer must not link them.
  it('does not link to pages that do not exist', () => {
    render(<Footer />);
    const hrefs = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    for (const dead of ['/docs', '/docs/api', '/help', '/about', '/contact']) expect(hrefs).not.toContain(dead);
  });
});
