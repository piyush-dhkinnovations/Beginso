/**
 * __tests__/components/dashboard/TopNav.test.tsx
 * Audit remediation: zero test coverage. Tests: renders the brand + user
 * dropdown, and the documented mobile navigation is provided below it by DashboardShell.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopNav } from '@/components/dashboard/TopNav';

vi.mock('@/components/dashboard/UserProfileDropdown', () => ({
  UserProfileDropdown: () => <div data-testid="user-profile-dropdown" />,
}));

describe('TopNav component', () => {
  it('renders the Beginso brand', () => {
    render(<TopNav />);
    expect(screen.getByText('Beginso')).toBeInTheDocument();
  });

  it('renders the user profile dropdown', () => {
    render(<TopNav />);
    expect(screen.getByTestId('user-profile-dropdown')).toBeInTheDocument();
  });

  it('keeps the notification control at least 44px square', () => {
    render(<TopNav />);
    expect(screen.getByLabelText('View notifications')).toHaveClass('min-h-11', 'min-w-11');
  });
});
