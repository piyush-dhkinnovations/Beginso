import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileAnswer } from '@/components/responses/answers/FileAnswer';
import type { IResponseFile } from '@/types/response';

const mockToast = vi.fn();
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: mockToast }) }));

const mockGetFileBlob = vi.fn();
vi.mock('@/services/responses', () => ({
  responsesService: { getFileBlob: (...a: unknown[]) => mockGetFileBlob(...a) },
}));

const file = (name: string, size = 2048): IResponseFile => ({ id: 'f1', name, size, type: 'x', url: '/u', uploadTime: '2026-01-01' });

let blobs: Blob[];

beforeEach(() => {
  blobs = [];
  mockToast.mockReset();
  mockGetFileBlob.mockReset().mockResolvedValue(new Blob(['abc']));
  URL.createObjectURL = vi.fn((b: Blob) => {
    blobs.push(b);
    return 'blob:mock';
  });
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => vi.restoreAllMocks());

describe('FileAnswer', () => {
  it('shows name, format and size', () => {
    render(<FileAnswer responseId="r1" file={file('cv.pdf', 2048)} />);
    expect(screen.getByText('cv.pdf')).toBeInTheDocument();
    expect(screen.getByText(/PDF · 2(\.0)? KB/)).toBeInTheDocument();
  });

  it('offers Preview only for previewable formats', () => {
    const { unmount } = render(<FileAnswer responseId="r1" file={file('a.PNG')} />);
    expect(screen.getByRole('button', { name: 'Preview a.PNG' })).toBeInTheDocument();
    unmount();
    render(<FileAnswer responseId="r1" file={file('page.html')} />);
    expect(screen.queryByRole('button', { name: /Preview/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download page.html' })).toBeInTheDocument();
  });

  it('labels a file with no extension as File', () => {
    render(<FileAnswer responseId="r1" file={file('README')} />);
    expect(screen.getByText(/^File ·/)).toBeInTheDocument();
  });

  it('previews in a new tab with a blob re-typed from the extension, never from the server', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<FileAnswer responseId="r1" file={file('doc.pdf')} />);
    await userEvent.click(screen.getByRole('button', { name: 'Preview doc.pdf' }));
    await waitFor(() => expect(open).toHaveBeenCalledWith('blob:mock', '_blank', 'noopener,noreferrer'));
    expect(mockGetFileBlob).toHaveBeenCalledWith('r1', 'f1');
    expect(blobs[0].type).toBe('application/pdf');
  });

  it('downloads as an octet-stream via an anchor with the file name', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    render(<FileAnswer responseId="r1" file={file('doc.pdf')} />);
    await userEvent.click(screen.getByRole('button', { name: 'Download doc.pdf' }));
    await waitFor(() => expect(click).toHaveBeenCalled());
    expect(blobs[0].type).toBe('application/octet-stream');
    expect(click.mock.instances[0]).toMatchObject({ download: 'doc.pdf' });
  });

  it('toasts an error when the download fails', async () => {
    mockGetFileBlob.mockRejectedValue(new Error('x'));
    render(<FileAnswer responseId="r1" file={file('doc.pdf')} />);
    await userEvent.click(screen.getByRole('button', { name: 'Download doc.pdf' }));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Could not download this file. Please try again.', 'error'));
  });

  it('toasts an error when the preview fails', async () => {
    mockGetFileBlob.mockRejectedValue(new Error('x'));
    render(<FileAnswer responseId="r1" file={file('doc.pdf')} />);
    await userEvent.click(screen.getByRole('button', { name: 'Preview doc.pdf' }));
    await waitFor(() => expect(mockToast).toHaveBeenCalledWith('Could not open this file. Please try again.', 'error'));
  });
});
