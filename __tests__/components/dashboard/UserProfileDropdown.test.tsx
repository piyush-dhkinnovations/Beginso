/**
 * __tests__/components/dashboard/UserProfileDropdown.test.tsx
 * Audit remediation: zero test coverage despite tasks.md marking it done.
 * Tests: opens on click, shows user initials/name, closes on outside-click
 * and Escape, calls logout.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

const mockGetProfile = vi.fn();
vi.mock('@/services/settings', () => ({
  settingsService: { getProfile: (...args: unknown[]) => mockGetProfile(...args) },
}));

function renderDropdown(ui: React.ReactElement = <UserProfileDropdown />) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('UserProfileDropdown component', () => {
  beforeEach(() => {
    mockLogout.mockReset();
    mockGetProfile.mockReset();
    mockGetProfile.mockResolvedValue({ avatarUrl: null });
    mockUseAuth.mockReturnValue({
      user: { name: 'Jane Doe', email: 'jane@example.com' },
      logout: mockLogout,
      isLoading: false,
    });
  });

  it('shows the user initials from their name', () => {
    renderDropdown();
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('falls back to "U" when there is no user name', () => {
    mockUseAuth.mockReturnValue({ user: undefined, logout: mockLogout, isLoading: false });
    renderDropdown();
    expect(screen.getByText('U')).toBeInTheDocument();
  });

  it('shows the real avatar photo instead of initials once one is loaded', async () => {
    mockGetProfile.mockResolvedValue({ avatarUrl: 'https://example.com/avatar.jpg' });
    const { container } = renderDropdown();
    await waitFor(() => expect(container.querySelector('img')).toBeInTheDocument());
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    expect(screen.queryByText('JD')).not.toBeInTheDocument();
  });

  it('is closed by default', () => {
    renderDropdown();
    expect(screen.queryByText('Log out')).not.toBeInTheDocument();
  });

  it('opens the menu on click, showing the name/email and Log out action', () => {
    renderDropdown();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Log out')).toBeInTheDocument();
    expect(screen.getAllByText('Jane Doe').length).toBeGreaterThan(0);
  });

  it('closes on outside click', () => {
    renderDropdown(
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
    renderDropdown();
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('Log out')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByText('Log out')).not.toBeInTheDocument();
  });

  it('calls logout when "Log out" is clicked', async () => {
    mockLogout.mockResolvedValue(undefined);
    renderDropdown();
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByText('Log out'));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
