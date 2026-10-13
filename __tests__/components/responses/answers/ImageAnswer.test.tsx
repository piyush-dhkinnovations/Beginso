import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageAnswer } from '@/components/responses/answers/ImageAnswer';
import type { BlobUrlState } from '@/hooks/useFileBlobUrls';
import type { FormField } from '@/types/form';
import type { IResponseFile } from '@/types/response';

let states: Record<string, BlobUrlState> = {};
vi.mock('@/hooks/useFileBlobUrls', () => ({ useFileBlobUrls: () => states }));

const file = (id: string): IResponseFile => ({ id, name: `${id}.png`, size: 1, type: 'image/png', url: `/${id}.png`, uploadTime: '2026-01-01' });
const field = (o: Record<string, unknown> = {}) => ({ type: 'image_upload', ...o }) as unknown as FormField;

beforeEach(() => {
  states = {};
});

describe('ImageAnswer', () => {
  it('shows a busy placeholder while loading and singular caption', () => {
    render(<ImageAnswer responseId="r" files={[file('a')]} />);
    expect(document.querySelector('[aria-busy="true"]')).toBeInTheDocument();
    expect(screen.getByText(/Uploaded image · Click to view full size/)).toBeInTheDocument();
  });

  it('shows an accessible error tile when an image cannot load', () => {
    states = { a: { status: 'error' } };
    render(<ImageAnswer responseId="r" files={[file('a')]} />);
    expect(screen.getByRole('img', { name: 'Could not load a.png' })).toBeInTheDocument();
  });

  it('uses the plural caption for several images', () => {
    render(<ImageAnswer responseId="r" files={[file('a'), file('b')]} />);
    expect(screen.getByText(/2 uploaded images/)).toBeInTheDocument();
  });

  it('caps a single small image to 160px and leaves large uncapped', () => {
    states = { a: { status: 'ready', url: 'blob:a' } };
    const { container, rerender } = render(<ImageAnswer responseId="r" field={field({ previewSize: 'small' })} files={[file('a')]} />);
    expect(container.querySelector('ul')).toHaveStyle({ maxWidth: '160px' });
    rerender(<ImageAnswer responseId="r" field={field({ previewSize: 'large' })} files={[file('a')]} />);
    expect(container.querySelector('ul')?.style.maxWidth).toBe('');
  });

  it('sizes grid columns from the preview size for several images', () => {
    const { container } = render(<ImageAnswer responseId="r" field={field({ previewSize: 'medium' })} files={[file('a'), file('b')]} />);
    expect(container.querySelector('ul')?.style.gridTemplateColumns).toContain('minmax(160px, 1fr)');
  });

  describe('lightbox', () => {
    beforeEach(() => {
      states = { a: { status: 'ready', url: 'blob:a' }, b: { status: 'ready', url: 'blob:b' } };
    });

    it('opens on click with the clicked image and closes with the close button', async () => {
      render(<ImageAnswer responseId="r" files={[file('a'), file('b')]} />);
      await userEvent.click(screen.getByRole('button', { name: 'View full size: b.png' }));
      const dialog = screen.getByRole('dialog', { name: 'Image viewer: b.png' });
      expect(dialog).toHaveTextContent('b.png · 2 of 2');
      expect(screen.getByRole('button', { name: 'Close image viewer' })).toHaveFocus();
      await userEvent.click(screen.getByRole('button', { name: 'Close image viewer' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('navigates with buttons and arrow keys, wrapping around', async () => {
      render(<ImageAnswer responseId="r" files={[file('a'), file('b')]} />);
      await userEvent.click(screen.getByRole('button', { name: 'View full size: a.png' }));
      await userEvent.click(screen.getByRole('button', { name: 'Next image' }));
      expect(screen.getByRole('dialog')).toHaveTextContent('b.png · 2 of 2');
      await userEvent.keyboard('{ArrowRight}');
      expect(screen.getByRole('dialog')).toHaveTextContent('a.png · 1 of 2');
      await userEvent.keyboard('{ArrowLeft}');
      expect(screen.getByRole('dialog')).toHaveTextContent('b.png · 2 of 2');
      await userEvent.click(screen.getByRole('button', { name: 'Previous image' }));
      expect(screen.getByRole('dialog')).toHaveTextContent('a.png · 1 of 2');
    });

    it('Escape closes only the viewer and does not reach other keydown listeners', async () => {
      const outer = vi.fn();
      document.addEventListener('keydown', outer);
      render(<ImageAnswer responseId="r" files={[file('a'), file('b')]} />);
      await userEvent.click(screen.getByRole('button', { name: 'View full size: a.png' }));
      await userEvent.keyboard('{Escape}');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(outer).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }));
      document.removeEventListener('keydown', outer);
    });

    it('closes when the backdrop is clicked but not when the image is', async () => {
      render(<ImageAnswer responseId="r" files={[file('a'), file('b')]} />);
      await userEvent.click(screen.getByRole('button', { name: 'View full size: a.png' }));
      fireEvent.click(screen.getByRole('dialog').querySelector('img')!);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('dialog'));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('traps Tab inside the viewer', async () => {
      render(<ImageAnswer responseId="r" files={[file('a'), file('b')]} />);
      await userEvent.click(screen.getByRole('button', { name: 'View full size: a.png' }));
      const close = screen.getByRole('button', { name: 'Close image viewer' });
      expect(close).toHaveFocus();
      await userEvent.tab({ shift: true });
      expect(screen.getByRole('button', { name: 'Next image' })).toHaveFocus();
      await userEvent.tab();
      expect(close).toHaveFocus();
    });

    it('has no prev/next for a single image and returns focus on close', async () => {
      states = { a: { status: 'ready', url: 'blob:a' } };
      render(<ImageAnswer responseId="r" files={[file('a')]} />);
      const open = screen.getByRole('button', { name: 'View full size: a.png' });
      open.focus();
      await userEvent.click(open);
      expect(screen.queryByRole('button', { name: 'Next image' })).not.toBeInTheDocument();
      expect(screen.getByRole('dialog')).toHaveTextContent(/^.*a\.png$/);
      await userEvent.keyboard('{Escape}');
      expect(open).toHaveFocus();
    });
  });
});
