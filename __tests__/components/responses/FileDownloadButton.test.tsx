/**
 * __tests__/components/responses/FileDownloadButton.test.tsx
 * Feature: sprint-4-responses
 * Tests: FileDownloadButton — renders name/size, Preview opens a fresh blob URL in a new tab,
 * Download triggers a real file download via a fresh blob URL (not a raw navigate to the
 * backend's file URL, which requires auth a bare window.open() can't send — see
 * services/responses.ts's getFileBlobUrl), disabled state, per-action error toasts
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

const mockGetFileBlobUrl = vi.fn();
vi.mock('@/services/responses', () => ({
  responsesService: { getFileBlobUrl: (...args: unknown[]) => mockGetFileBlobUrl(...args) },
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
    mockGetFileBlobUrl.mockReset();
    vi.spyOn(window, 'open').mockImplementation(() => null);
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  it('renders the filename and formatted file size', () => {
    render(<FileDownloadButton {...baseProps} />);
    expect(screen.getByText('resume.pdf')).toBeInTheDocument();
    expect(screen.getByText('246.0 KB')).toBeInTheDocument();
  });

  it('Preview fetches a fresh blob URL on every click and opens it in a new tab', async () => {
    const user = userEvent.setup();
    mockGetFileBlobUrl.mockResolvedValue('blob:mock-url');
    render(<FileDownloadButton {...baseProps} />);

    const button = screen.getByRole('button', { name: 'Preview resume.pdf' });
    await user.click(button);
    await user.click(button);

    expect(mockGetFileBlobUrl).toHaveBeenCalledTimes(2);
    expect(mockGetFileBlobUrl).toHaveBeenCalledWith('resp-1', 'file-1');
    expect(window.open).toHaveBeenCalledWith('blob:mock-url', '_blank');
  });

  it('Download fetches a fresh blob URL and triggers a real file download', async () => {
    const user = userEvent.setup();
    mockGetFileBlobUrl.mockResolvedValue('blob:mock-url');
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<FileDownloadButton {...baseProps} />);

    await user.click(screen.getByRole('button', { name: 'Download resume.pdf' }));

    expect(mockGetFileBlobUrl).toHaveBeenCalledWith('resp-1', 'file-1');
    expect(clickSpy).toHaveBeenCalledOnce();
  });

  it('renders both Preview and Download disabled when isAvailable is false', () => {
    render(<FileDownloadButton {...baseProps} isAvailable={false} />);
    expect(screen.getByRole('button', { name: 'Preview resume.pdf' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Download resume.pdf' })).toBeDisabled();
  });

  it('shows an error toast when Preview fails', async () => {
    const user = userEvent.setup();
    mockGetFileBlobUrl.mockRejectedValue(new Error('network error'));
    render(<FileDownloadButton {...baseProps} />);

    await user.click(screen.getByRole('button', { name: 'Preview resume.pdf' }));

    expect(mockToast).toHaveBeenCalledWith('Failed to open file. Please try again.', 'error');
  });

  it('shows an error toast when Download fails', async () => {
    const user = userEvent.setup();
    mockGetFileBlobUrl.mockRejectedValue(new Error('network error'));
    render(<FileDownloadButton {...baseProps} />);

    await user.click(screen.getByRole('button', { name: 'Download resume.pdf' }));

    expect(mockToast).toHaveBeenCalledWith('Failed to download file. Please try again.', 'error');
  });

  it('has aria-labels matching the originalName for both actions', () => {
    render(<FileDownloadButton {...baseProps} originalName="contract.docx" />);
    expect(screen.getByRole('button', { name: 'Preview contract.docx' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download contract.docx' })).toBeInTheDocument();
  });
});
