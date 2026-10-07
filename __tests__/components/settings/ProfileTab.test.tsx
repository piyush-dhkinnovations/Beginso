/**
 * __tests__/components/settings/ProfileTab.test.tsx
 * Feature: sprint-6-settings
 * Tests: ProfileTab — renders profile, name save success/error, no-op guard, validation error,
 * loading skeleton, load-error retry
 * Requirements: 2.1-2.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetProfile = vi.fn();
const mockUpdateProfile = vi.fn();
vi.mock('@/services/settings', () => ({
  settingsService: {
    getProfile: (...args: unknown[]) => mockGetProfile(...args),
    updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  },
}));

const mockToast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

// ProfileTab now renders ChangePasswordModal (closed by default) alongside the name form —
// @/lib/firebase's real getAuth() throws in this test env without a valid API key, so it needs
// the same mock ChangePasswordModal's own test file uses, even though these tests never open it.
vi.mock('@/lib/firebase', () => ({ auth: {} }));

// AvatarUploader has its own dedicated test file — mocked here so ProfileTab's test stays
// focused on the name field/save flow.
vi.mock('@/components/settings/AvatarUploader', () => ({
  AvatarUploader: () => <div data-testid="avatar-uploader" />,
}));

import { ProfileTab } from '@/components/settings/ProfileTab';

function renderTab() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProfileTab />
    </QueryClientProvider>
  );
}

describe('ProfileTab', () => {
  beforeEach(() => {
    mockGetProfile.mockReset();
    mockUpdateProfile.mockReset();
    mockToast.mockReset();
  });

  it('shows a loading skeleton while the profile query is in flight', () => {
    mockGetProfile.mockReturnValue(new Promise(() => {}));
    const { container } = renderTab();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('renders the loaded name and read-only email', async () => {
    mockGetProfile.mockResolvedValue({ id: 'u1', name: 'Jordan Rivera', email: 'jordan@example.com', avatarUrl: null, emailVerified: true, createdAt: '', lastLoginAt: '' });
    renderTab();

    expect(await screen.findByDisplayValue('Jordan Rivera')).toBeInTheDocument();
    expect(screen.getByDisplayValue('jordan@example.com')).toBeDisabled();
  });

  it('shows an inline error with retry when the profile fails to load', async () => {
    mockGetProfile.mockRejectedValue(new Error('fail'));
    renderTab();

    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Unable to load your profile.')).toBeInTheDocument();
  });

  it('disables Save while the name is unchanged (no-op guard)', async () => {
    mockGetProfile.mockResolvedValue({ id: 'u1', name: 'Jordan Rivera', email: 'jordan@example.com', avatarUrl: null, emailVerified: true, createdAt: '', lastLoginAt: '' });
    renderTab();

    await screen.findByDisplayValue('Jordan Rivera');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
  });

  it('enables Save once the name changes, and saving shows a success toast', async () => {
    mockGetProfile.mockResolvedValue({ id: 'u1', name: 'Jordan Rivera', email: 'jordan@example.com', avatarUrl: null, emailVerified: true, createdAt: '', lastLoginAt: '' });
    mockUpdateProfile.mockResolvedValue({ id: 'u1', name: 'Jordan R.', email: 'jordan@example.com', avatarUrl: null, emailVerified: true, createdAt: '', lastLoginAt: '' });
    renderTab();

    const nameInput = await screen.findByDisplayValue('Jordan Rivera');
    fireEvent.change(nameInput, { target: { value: 'Jordan R.' } });
    expect(screen.getByRole('button', { name: 'Save changes' })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith({ name: 'Jordan R.' }));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Profile updated.', 'success'));
  });

  it('rejects a name under 2 characters with a validation error, preserving the input', async () => {
    mockGetProfile.mockResolvedValue({ id: 'u1', name: 'Jordan Rivera', email: 'jordan@example.com', avatarUrl: null, emailVerified: true, createdAt: '', lastLoginAt: '' });
    renderTab();

    const nameInput = await screen.findByDisplayValue('Jordan Rivera');
    fireEvent.change(nameInput, { target: { value: 'J' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Name must be at least 2 characters.')).toBeInTheDocument();
    expect(mockUpdateProfile).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('J')).toBeInTheDocument();
  });

  it('shows a failure toast and preserves the unsaved input when the save fails', async () => {
    mockGetProfile.mockResolvedValue({ id: 'u1', name: 'Jordan Rivera', email: 'jordan@example.com', avatarUrl: null, emailVerified: true, createdAt: '', lastLoginAt: '' });
    mockUpdateProfile.mockRejectedValue(new Error('network error'));
    renderTab();

    const nameInput = await screen.findByDisplayValue('Jordan Rivera');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Failed to update profile. Please try again.', 'error'));
    expect(screen.getByDisplayValue('New Name')).toBeInTheDocument();
  });
});
