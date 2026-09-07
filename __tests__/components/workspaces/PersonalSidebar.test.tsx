/**
 * __tests__/components/workspaces/PersonalSidebar.test.tsx
 * Feature: sprint-8-workspaces-context, requirements.md §7.3
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PersonalSidebar } from '@/components/workspaces/PersonalSidebar';

const mockPathname = vi.fn();
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}));

describe('PersonalSidebar', () => {
  beforeEach(() => {
    mockPathname.mockReturnValue('/dashboard');
  });

  it('renders the personal nav set', () => {
    render(<PersonalSidebar />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('My Forms')).toBeInTheDocument();
    expect(screen.getByText('All Workspaces')).toBeInTheDocument();
  });

  it('does not render a My Submissions link — no route exists for it yet', () => {
    render(<PersonalSidebar />);
    expect(screen.queryByText('My Submissions')).not.toBeInTheDocument();
  });

  it('marks Home active on /dashboard', () => {
    mockPathname.mockReturnValue('/dashboard');
    render(<PersonalSidebar />);
    expect(screen.getByRole('link', { name: /Home/ })).toHaveAttribute('aria-current', 'page');
  });

  it('marks My Forms active on /forms and its subroutes', () => {
    mockPathname.mockReturnValue('/forms/abc123');
    render(<PersonalSidebar />);
    expect(screen.getByRole('link', { name: /My Forms/ })).toHaveAttribute('aria-current', 'page');
  });

  it('marks nothing active on an unrelated route', () => {
    mockPathname.mockReturnValue('/settings');
    render(<PersonalSidebar />);
    expect(screen.getByRole('link', { name: /Home/ })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: /My Forms/ })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: /All Workspaces/ })).not.toHaveAttribute('aria-current');
  });
});
