/**
 * __tests__/components/dashboard/UserProfileDropdown.test.tsx
 * Audit remediation: zero test coverage despite tasks.md marking it done.
 * Tests: opens on click, shows user initials/name, closes on outside-click
 * and Escape, calls logout.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { UserProfileDropdown } from '@/components/dashboard/UserProfileDropdown';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const mockLogout = vi.fn();
const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('UserProfileDropdown component', () => {
  beforeEach(() => {
    mockLogout.mockReset();
    mockUseAuth.mockReturnValue({
      user: { name: 'Jane Doe', email: 'jane@example.com' },
      logout: mockLogout,
      isLoading: false,
    });
  });

  it('shows the user initials from their name', () => {
    render(<UserProfileDropdown />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('falls back to "U" when there is no user name', () => {
    mockUseAuth.mockReturnValue({ user: undefined, logout: mockLogout, isLoading: false });
    render(<UserProfileDropdown />);
    expect(screen.getByText('U')).toBeInTheDocument();
  });

  it('is closed by default', () => {
    render(<UserProfileDropdown />);
    expect(screen.queryByText('Log out')).not.toBeInTheDocument();
  });

  it('opens the menu on click, showing the name/email and Log out action', () => {
    render(<UserProfileDropdown />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Log out')).toBeInTheDocument();
    expect(screen.getAllByText('Jane Doe').length).toBeGreaterThan(0);
  });

  it('closes on outside click', () => {
    render(
      <div>
        <div data-testid="outside">outside</div>
        <UserProfileDropdown />
      </div>
    );
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Log out')).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByText('Log out')).not.toBeInTheDocument();
  });

  it('closes on Escape', () => {
    render(<UserProfileDropdown />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Log out')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Log out')).not.toBeInTheDocument();
  });

  it('calls logout when "Log out" is clicked', async () => {
    mockLogout.mockResolvedValue(undefined);
    render(<UserProfileDropdown />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Log out'));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
