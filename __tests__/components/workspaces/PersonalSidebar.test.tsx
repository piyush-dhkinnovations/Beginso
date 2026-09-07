/**
 * __tests__/components/workspaces/PersonalSidebar.test.tsx
 * Feature: sprint-8-workspaces-context, requirements.md §7.3 (corrected Day 3 against A1.1/A1.3)
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

  it('renders the real A1.1 personal nav set', () => {
    render(<PersonalSidebar />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('My Forms')).toBeInTheDocument();
    expect(screen.getByText('Templates')).toBeInTheDocument();
    expect(screen.getByText('Create workspace')).toBeInTheDocument();
  });

  it('does not render Shared with me or My Submissions — both deferred, tracked gaps', () => {
    render(<PersonalSidebar />);
    expect(screen.queryByText('Shared with me')).not.toBeInTheDocument();
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

  it('marks Templates active on /templates', () => {
    mockPathname.mockReturnValue('/templates');
    render(<PersonalSidebar />);
    expect(screen.getByRole('link', { name: /Templates/ })).toHaveAttribute('aria-current', 'page');
  });

  it('marks Create workspace active on /workspaces', () => {
    mockPathname.mockReturnValue('/workspaces');
    render(<PersonalSidebar />);
    expect(screen.getByRole('link', { name: /Create workspace/ })).toHaveAttribute('aria-current', 'page');
  });

  it('marks nothing active on an unrelated route', () => {
    mockPathname.mockReturnValue('/settings');
    render(<PersonalSidebar />);
    expect(screen.getByRole('link', { name: /Home/ })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: /My Forms/ })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: /Templates/ })).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('link', { name: /Create workspace/ })).not.toHaveAttribute('aria-current');
  });
});
