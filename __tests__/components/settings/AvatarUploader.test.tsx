/**
 * __tests__/components/settings/AvatarUploader.test.tsx
 * Feature: sprint-6-settings
 * Tests: AvatarUploader — fallback initials, valid upload flow, invalid file rejected inline,
 * remove-photo flow, upload/save failure reverts
 * Requirements: 3.1-3.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockUploadFile = vi.fn();
vi.mock('@/services/upload', () => ({
  uploadService: { uploadFile: (...args: unknown[]) => mockUploadFile(...args) },
}));

const mockUpdateProfile = vi.fn();
vi.mock('@/services/settings', () => ({
  settingsService: { updateProfile: (...args: unknown[]) => mockUpdateProfile(...args) },
}));

const mockToast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

import { AvatarUploader } from '@/components/settings/AvatarUploader';

function renderUploader(props: Partial<React.ComponentProps<typeof AvatarUploader>> = {}) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <AvatarUploader name="Jordan Rivera" avatarUrl={null} {...props} />
    </QueryClientProvider>
  );
}

describe('AvatarUploader', () => {
  beforeEach(() => {
    mockUploadFile.mockReset();
    mockUpdateProfile.mockReset();
    mockToast.mockReset();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('shows fallback initials when there is no avatarUrl', () => {
    renderUploader({ name: 'Jordan Rivera', avatarUrl: null });
    expect(screen.getByText('JR')).toBeInTheDocument();
  });

  it('renders the avatar image when avatarUrl is set, with no Remove-photo action when it is not', () => {
    renderUploader({ avatarUrl: null });
    expect(screen.queryByRole('button', { name: 'Remove photo' })).not.toBeInTheDocument();
  });

  it('shows the Remove-photo action once an avatar exists', () => {
    renderUploader({ avatarUrl: 'https://example.com/avatar.jpg' });
    expect(screen.getByRole('button', { name: 'Remove photo' })).toBeInTheDocument();
  });

  it('uploads a valid image and saves the returned URL', async () => {
    mockUploadFile.mockResolvedValue({ url: 'https://example.com/new-avatar.jpg' });
    mockUpdateProfile.mockResolvedValue({});
    renderUploader();

    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    const input = document.getElementById('avatar-file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(mockUploadFile).toHaveBeenCalledWith(file));
    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith({ avatarUrl: 'https://example.com/new-avatar.jpg' }));
  });

  it('rejects an oversized file inline without attempting an upload', async () => {
    renderUploader();
    const oversized = new File(['x'.repeat(10)], 'big.png', { type: 'image/png' });
    Object.defineProperty(oversized, 'size', { value: 6 * 1024 * 1024 });

    const input = document.getElementById('avatar-file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [oversized] } });

    expect(await screen.findByText('Please upload a JPEG, PNG, or WebP image under 5 MB.')).toBeInTheDocument();
    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it('rejects a wrong-type file inline without attempting an upload', async () => {
    renderUploader();
    const wrongType = new File(['x'], 'doc.pdf', { type: 'application/pdf' });

    const input = document.getElementById('avatar-file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [wrongType] } });

    expect(await screen.findByText('Please upload a JPEG, PNG, or WebP image under 5 MB.')).toBeInTheDocument();
    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it('shows a toast and does not throw when the upload fails', async () => {
    mockUploadFile.mockRejectedValue(new Error('network error'));
    renderUploader();

    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    const input = document.getElementById('avatar-file-input') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Failed to update photo. Please try again.', 'error'));
  });

  it('removes the photo after confirmation', async () => {
    mockUpdateProfile.mockResolvedValue({});
    renderUploader({ avatarUrl: 'https://example.com/avatar.jpg' });

    fireEvent.click(screen.getByRole('button', { name: 'Remove photo' }));

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalledWith({ avatarUrl: null }));
  });

  it('does not remove the photo when the confirm is dismissed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderUploader({ avatarUrl: 'https://example.com/avatar.jpg' });

    fireEvent.click(screen.getByRole('button', { name: 'Remove photo' }));

    expect(mockUpdateProfile).not.toHaveBeenCalled();
  });
});
