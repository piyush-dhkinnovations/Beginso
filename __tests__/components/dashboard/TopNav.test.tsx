/**
 * __tests__/components/dashboard/TopNav.test.tsx
 * Audit remediation: zero test coverage. Tests: renders the brand + user
 * dropdown, and the mobile hamburger calls back into DashboardShell.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TopNav } from '@/components/dashboard/TopNav';

vi.mock('@/components/dashboard/UserProfileDropdown', () => ({
  UserProfileDropdown: () => <div data-testid="user-profile-dropdown" />,
}));

describe('TopNav component', () => {
  it('renders the Beginso brand', () => {
    render(<TopNav onToggleMobileSidebar={vi.fn()} />);
    expect(screen.getByText('Beginso')).toBeInTheDocument();
  });

  it('renders the user profile dropdown', () => {
    render(<TopNav onToggleMobileSidebar={vi.fn()} />);
    expect(screen.getByTestId('user-profile-dropdown')).toBeInTheDocument();
  });

  it('calls onToggleMobileSidebar when the hamburger button is clicked', () => {
    const onToggle = vi.fn();
    render(<TopNav onToggleMobileSidebar={onToggle} />);
    fireEvent.click(screen.getByLabelText('Toggle navigation menu'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
