import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FileUploadRenderer } from '@/components/public-form/fields/FileUploadRenderer';
import type { UploadState } from '@/types/publicForm';
import { Harness, makeField, readValues } from './harness';

const field = makeField({ type: 'file_upload', label: 'Resume' });

function makeFile(name: string, type: string, size = 1024) {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
}

const MB = 1024 * 1024;
let createUrl: ReturnType<typeof vi.fn>;
let revokeUrl: ReturnType<typeof vi.fn>;

beforeEach(() => {
  createUrl = vi.fn(() => 'blob:preview');
  revokeUrl = vi.fn();
  Object.assign(URL, { createObjectURL: createUrl, revokeObjectURL: revokeUrl });
});
afterEach(() => vi.restoreAllMocks());

function setup(extra: Parameters<typeof Harness>[0]['extra'] = {}, props: Partial<Parameters<typeof Harness>[0]> = {}) {
  return render(<Harness Renderer={FileUploadRenderer} field={field} extra={extra} {...props} />);
}

describe('FileUploadRenderer', () => {
  it('starts idle with a drop zone that states the 25 MB limit', () => {
    setup();
    expect(screen.getByRole('button', { name: /upload a file/i })).toBeInTheDocument();
    expect(screen.getByText(/up to 25 MB/)).toBeInTheDocument();
  });

  it('rejects a file over 25 MB with the validator message and a Retry action', async () => {
    const onFileChange = vi.fn();
    setup({ onFileChange });
    const input = document.getElementById('f1') as HTMLInputElement;
    await userEvent.upload(input, makeFile('big.pdf', 'application/pdf', 25 * MB + 1));
    expect(screen.getByText('File exceeds the 25 MB limit.')).toBeInTheDocument();
    expect(screen.getByText('big.pdf')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(onFileChange).not.toHaveBeenCalled();
    expect(readValues(screen.getByTestId('values'))).toEqual({});
  });

  it('accepts a file of exactly 25 MB', async () => {
    setup();
    await userEvent.upload(document.getElementById('f1') as HTMLInputElement, makeFile('edge.pdf', 'application/pdf', 25 * MB));
    expect(screen.queryByText(/exceeds/)).not.toBeInTheDocument();
    expect(screen.getByText('edge.pdf')).toBeInTheDocument();
  });

  it('rejects an unsupported type', async () => {
    setup();
    await userEvent.upload(document.getElementById('f1') as HTMLInputElement, makeFile('run.exe', 'application/x-msdownload'));
    expect(screen.getByText(/File type not supported/)).toBeInTheDocument();
  });

  it('hands the File up, stores the name, progresses to Ready, and reports upload states', async () => {
    const onFileChange = vi.fn();
    const states: UploadState[] = [];
    setup({ onFileChange, onUploadStateChange: (s) => states.push(s) });
    const file = makeFile('cv.pdf', 'application/pdf', 2048);
    await userEvent.upload(document.getElementById('f1') as HTMLInputElement, file);

    expect(onFileChange).toHaveBeenCalledWith(file);
    expect(readValues(screen.getByTestId('values'))).toEqual({ f1: 'cv.pdf' });
    await waitFor(() => expect(screen.getByText(/Ready · 2\.0 KB/)).toBeInTheDocument());
    const seq = states.map((s) => s.status);
    expect(seq[0]).toBe('idle');
    expect(seq).toContain('uploading');
    expect(seq[seq.length - 1]).toBe('uploaded');
  });

  it('shows a preview thumbnail only for images', async () => {
    setup();
    await userEvent.upload(document.getElementById('f1') as HTMLInputElement, makeFile('p.png', 'image/png'));
    expect(createUrl).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText(/Ready/)).toBeInTheDocument());
    expect(document.querySelector('img')).toHaveAttribute('src', 'blob:preview');
  });

  it('does not create a preview URL for non-images', async () => {
    setup();
    await userEvent.upload(document.getElementById('f1') as HTMLInputElement, makeFile('d.pdf', 'application/pdf'));
    expect(createUrl).not.toHaveBeenCalled();
  });

  it('Remove clears the value, tells the shell (null), revokes the preview and returns to idle', async () => {
    const onFileChange = vi.fn();
    setup({ onFileChange });
    await userEvent.upload(document.getElementById('f1') as HTMLInputElement, makeFile('p.png', 'image/png'));
    await userEvent.click(await screen.findByRole('button', { name: 'Remove' }));
    expect(onFileChange).toHaveBeenLastCalledWith(null);
    expect(revokeUrl).toHaveBeenCalledWith('blob:preview');
    expect(readValues(screen.getByTestId('values'))).toEqual({});
    expect(screen.getByRole('button', { name: /upload a file/i })).toBeInTheDocument();
  });

  it('revokes a live preview URL on unmount', async () => {
    const { unmount } = setup();
    await userEvent.upload(document.getElementById('f1') as HTMLInputElement, makeFile('p.png', 'image/png'));
    unmount();
    expect(revokeUrl).toHaveBeenCalledWith('blob:preview');
  });

  it('accepts a dropped file', () => {
    const onFileChange = vi.fn();
    setup({ onFileChange });
    const file = makeFile('dropped.pdf', 'application/pdf');
    fireEvent.drop(screen.getByRole('button', { name: /upload a file/i }), { dataTransfer: { files: [file] } });
    expect(onFileChange).toHaveBeenCalledWith(file);
  });

  it('opens the file picker from the keyboard (Enter and Space)', async () => {
    setup();
    const input = document.getElementById('f1') as HTMLInputElement;
    const click = vi.spyOn(input, 'click').mockImplementation(() => {});
    const zone = screen.getByRole('button', { name: /upload a file/i });
    zone.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(click).toHaveBeenCalledTimes(2);
  });

  it('disables the underlying input and shows a validation error', () => {
    setup({}, { disabled: true, error: { type: 'required', message: 'A file is required' } });
    expect(document.getElementById('f1')).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('A file is required');
  });
});
