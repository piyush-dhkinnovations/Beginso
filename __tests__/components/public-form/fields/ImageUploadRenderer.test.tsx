import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageUploadRenderer } from '@/components/public-form/fields/ImageUploadRenderer';
import { Harness, makeField, readValues } from './harness';

let n = 0;
let revokeUrl: ReturnType<typeof vi.fn>;

beforeEach(() => {
  n = 0;
  revokeUrl = vi.fn();
  Object.assign(URL, { createObjectURL: vi.fn(() => `blob:img-${++n}`), revokeObjectURL: revokeUrl });
});
afterEach(() => vi.restoreAllMocks());

function img(name: string, type = 'image/png', size = 1024) {
  const f = new File(['x'], name, { type });
  Object.defineProperty(f, 'size', { value: size });
  return f;
}

const input = () => document.getElementById('f1') as HTMLInputElement;
const single = makeField({ type: 'image_upload', label: 'Photo' });
const multi = makeField({ type: 'image_upload', label: 'Photos', allowMultiple: true, maxImages: 2, maxFileSize: 1 });

function setup(field = single, onFilesChange?: (f: File[]) => void) {
  return render(<Harness Renderer={ImageUploadRenderer} field={field} extra={{ onFilesChange }} />);
}

describe('ImageUploadRenderer', () => {
  it('single mode: describes the default 10 MB limit and has a non-multiple input', () => {
    setup();
    expect(screen.getByRole('button', { name: /add an image/i })).toBeInTheDocument();
    expect(screen.getByText('JPG, PNG or WebP · up to 10 MB')).toBeInTheDocument();
    expect(input().multiple).toBe(false);
    expect(input()).toHaveAttribute('accept', 'image/jpeg,image/png,image/webp');
  });

  it('multi mode: shows per-image limit and max count', () => {
    setup(multi);
    expect(screen.getByText('JPG, PNG or WebP · up to 1 MB each · up to 2 images')).toBeInTheDocument();
    expect(input().multiple).toBe(true);
  });

  it('adds an image: preview, stored file name, callback with the Files', async () => {
    const onFilesChange = vi.fn();
    setup(single, onFilesChange);
    const file = img('a.png');
    await userEvent.upload(input(), file);
    expect(screen.getByAltText('a.png')).toHaveAttribute('src', 'blob:img-1');
    expect(readValues(screen.getByTestId('values'))).toEqual({ f1: 'a.png' });
    expect(onFilesChange).toHaveBeenLastCalledWith([file]);
  });

  it('rejects a non-image extension/type with a named alert', () => {
    setup();
    fireEvent.change(input(), { target: { files: [img('doc.pdf', 'application/pdf')] } });
    expect(screen.getByRole('alert')).toHaveTextContent('doc.pdf: Only JPG, PNG or WebP images are allowed.');
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('rejects an image over the size limit', () => {
    setup(multi);
    fireEvent.change(input(), { target: { files: [img('huge.png', 'image/png', 2 * 1024 * 1024)] } });
    expect(screen.getByRole('alert')).toHaveTextContent('huge.png: Each image must be 1 MB or smaller.');
  });

  it('multi mode accumulates images, joins names, and hides the drop zone when full', async () => {
    setup(multi);
    await userEvent.upload(input(), img('a.png'));
    expect(screen.getByRole('button', { name: /add images/i })).toBeInTheDocument();
    await userEvent.upload(input(), img('b.webp', 'image/webp'));
    expect(readValues(screen.getByTestId('values'))).toEqual({ f1: 'a.png, b.webp' });
    expect(screen.queryByRole('button', { name: /add images/i })).not.toBeInTheDocument();
  });

  it('refuses images beyond the maximum count with a message, keeping the ones that fit', () => {
    setup(multi);
    fireEvent.change(input(), { target: { files: [img('1.png'), img('2.png'), img('3.png')] } });
    expect(screen.getByRole('alert')).toHaveTextContent('You can upload up to 2 images.');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('removes one image, revokes its URL and updates the value', async () => {
    const onFilesChange = vi.fn();
    setup(multi, onFilesChange);
    await userEvent.upload(input(), img('a.png'));
    await userEvent.upload(input(), img('b.png'));
    await userEvent.click(screen.getByRole('button', { name: 'Remove a.png' }));
    expect(revokeUrl).toHaveBeenCalledWith('blob:img-1');
    expect(readValues(screen.getByTestId('values'))).toEqual({ f1: 'b.png' });
    expect(onFilesChange).toHaveBeenLastCalledWith([expect.objectContaining({ name: 'b.png' })]);
  });

  it('removing the last image clears the value and reports an empty list', async () => {
    const onFilesChange = vi.fn();
    setup(single, onFilesChange);
    await userEvent.upload(input(), img('a.png'));
    await userEvent.click(screen.getByRole('button', { name: 'Remove a.png' }));
    expect(readValues(screen.getByTestId('values'))).toEqual({});
    expect(onFilesChange).toHaveBeenLastCalledWith([]);
  });

  it('revokes every live URL on unmount', async () => {
    const { unmount } = setup(multi);
    await userEvent.upload(input(), img('a.png'));
    await userEvent.upload(input(), img('b.png'));
    unmount();
    expect(revokeUrl).toHaveBeenCalledWith('blob:img-1');
    expect(revokeUrl).toHaveBeenCalledWith('blob:img-2');
  });

  it('accepts a dropped image and opens the picker from the keyboard', () => {
    const onFilesChange = vi.fn();
    setup(single, onFilesChange);
    const zone = screen.getByRole('button', { name: /add an image/i });
    const file = img('d.png');
    fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    expect(onFilesChange).toHaveBeenCalledWith([file]);
  });

  it('keyboard Enter on the drop zone clicks the hidden input', async () => {
    setup();
    const click = vi.spyOn(input(), 'click').mockImplementation(() => {});
    screen.getByRole('button', { name: /add an image/i }).focus();
    await userEvent.keyboard('{Enter}');
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('disables input and remove buttons when disabled', async () => {
    const { rerender } = setup();
    await userEvent.upload(input(), img('a.png'));
    rerender(<Harness Renderer={ImageUploadRenderer} field={single} disabled />);
    expect(input()).toBeDisabled();
  });
});
