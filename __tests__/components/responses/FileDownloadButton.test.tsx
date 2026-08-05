/**
 * __tests__/components/responses/FileDownloadButton.test.tsx
 * Feature: sprint-4-responses
 * Tests: FileDownloadButton — renders name/size, fetches fresh URL per click, disabled state, error toast
 * Requirements: 6.1-6.6
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileDownloadButton } from '@/components/responses/FileDownloadButton';

const mockToast = vi.fn();
vi.mock('@/components/common/Toast', () => ({
  useToast: () => ({ toast: mockToast }),
}));

const mockGetFileDownloadUrl = vi.fn();
vi.mock('@/services/responses', () => ({
  responsesService: { getFileDownloadUrl: (...args: unknown[]) => mockGetFileDownloadUrl(...args) },
}));

const baseProps = {
  responseId: 'resp-1',
  fileId: 'file-1',
  originalName: 'resume.pdf',
  size: 251904,
  mimeType: 'application/pdf',
  isAvailable: true,
};

describe('FileDownloadButton', () => {
  beforeEach(() => {
    mockToast.mockReset();
    mockGetFileDownloadUrl.mockReset();
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  it('renders the filename and formatted file size', () => {
    render(<FileDownloadButton {...baseProps} />);
    expect(screen.getByText('resume.pdf')).toBeInTheDocument();
    expect(screen.getByText('246.0 KB')).toBeInTheDocument();
  });

  it('calls getFileDownloadUrl on every click and opens the returned URL', async () => {
    const user = userEvent.setup();
    mockGetFileDownloadUrl.mockResolvedValue({ url: 'https://mock-r2.example.com/resume.pdf' });
    render(<FileDownloadButton {...baseProps} />);

    const button = screen.getByRole('button', { name: 'Download resume.pdf' });
    await user.click(button);
    await user.click(button);

    expect(mockGetFileDownloadUrl).toHaveBeenCalledTimes(2);
    expect(mockGetFileDownloadUrl).toHaveBeenCalledWith('resp-1', 'file-1');
    expect(window.open).toHaveBeenCalledWith('https://mock-r2.example.com/resume.pdf', '_blank');
  });

  it('renders disabled when isAvailable is false', () => {
    render(<FileDownloadButton {...baseProps} isAvailable={false} />);
    expect(screen.getByRole('button', { name: 'Download resume.pdf' })).toBeDisabled();
  });

  it('shows an error toast when the download URL fetch fails', async () => {
    const user = userEvent.setup();
    mockGetFileDownloadUrl.mockRejectedValue(new Error('network error'));
    render(<FileDownloadButton {...baseProps} />);

    await user.click(screen.getByRole('button', { name: 'Download resume.pdf' }));

    expect(mockToast).toHaveBeenCalledWith('Failed to generate download link. Please try again.', 'error');
  });

  it('has an aria-label matching the originalName', () => {
    render(<FileDownloadButton {...baseProps} originalName="contract.docx" />);
    expect(screen.getByRole('button', { name: 'Download contract.docx' })).toBeInTheDocument();
  });
});
