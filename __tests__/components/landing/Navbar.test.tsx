/**
 * __tests__/components/landing/Navbar.test.tsx
 * Audit remediation: Navbar had zero test coverage despite shipping since Sprint 1.
 * Tests: nav links present (Pricing intentionally absent — no #pricing section exists),
 * scroll-state class swap, mobile menu toggle.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Navbar from '@/components/landing/Navbar';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('Navbar component', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false });
    Object.defineProperty(window, 'scrollY', { writable: true, value: 0 });
  });

  it('renders the Beginso logo', () => {
    render(<Navbar />);
    expect(screen.getAllByAltText('Beginso').length).toBeGreaterThan(0);
  });

  it('renders the three shipped nav links — Features, How it works, Blog — with no Pricing link', () => {
    render(<Navbar />);
    expect(screen.getByText('Features')).toBeInTheDocument();
    expect(screen.getByText('How it works')).toBeInTheDocument();
    expect(screen.getByText('Blog')).toBeInTheDocument();
    expect(screen.queryByText(/pricing/i)).not.toBeInTheDocument();
  });

  it('shows Log in / Start free when logged out', () => {
    render(<Navbar />);
    expect(screen.getByText('Log in')).toBeInTheDocument();
    expect(screen.getAllByText('Start free').length).toBeGreaterThan(0);
    expect(screen.queryByText('Go to dashboard')).not.toBeInTheDocument();
  });

  it('shows Go to dashboard when authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true });
    render(<Navbar />);
    expect(screen.getAllByText('Go to dashboard').length).toBeGreaterThan(0);
    expect(screen.queryByText('Log in')).not.toBeInTheDocument();
  });

  it('swaps to the scrolled (opaque + blur) class past the 40px threshold', () => {
    render(<Navbar />);
    const header = document.querySelector('header')!;
    expect(header.className).toContain('bg-transparent');

    Object.defineProperty(window, 'scrollY', { writable: true, value: 120 });
    fireEvent.scroll(window);

    expect(header.className).toContain('backdrop-blur-md');
    expect(header.className).not.toContain('bg-transparent');
  });

  it('toggles the mobile menu open and closed on hamburger click', () => {
    render(<Navbar />);
    const toggle = screen.getByLabelText('Open main menu');
    expect(document.getElementById('mobile-menu')).toBeNull();

    fireEvent.click(toggle);
    expect(document.getElementById('mobile-menu')).not.toBeNull();
    expect(screen.getByLabelText('Close main menu')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Close main menu'));
    expect(document.getElementById('mobile-menu')).toBeNull();
  });

  it('closes the mobile menu on Escape', () => {
    render(<Navbar />);
    fireEvent.click(screen.getByLabelText('Open main menu'));
    expect(document.getElementById('mobile-menu')).not.toBeNull();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(document.getElementById('mobile-menu')).toBeNull();
  });
});
