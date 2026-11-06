/**
 * The crop icon on a picture, and a crop that can be adjusted later: reopening it shows the ORIGINAL picture framed as it was left (same shape, place
 * and zoom), not the cropped result at 100%. A new upload keeps its original; a photo from Unsplash stays linked and carries its crop in its address.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));

import { ImageUploadZone } from '@/components/form-builder/BrandingPanel';
import type { CropMemo } from '@/types/form';

const ORIGINAL = '/api/upload/file/u1/f1/brand/original.png';
const RESULT = '/api/upload/file/u1/f1/brand/cropped.jpg';
const MEMO: CropMemo = { from: ORIGINAL, result: RESULT, aspect: 3.2, fx: 0.3, fy: 0.6, zoom: 1.78 };

function draw(over: Partial<React.ComponentProps<typeof ImageUploadZone>> = {}) {
  const onUpload = vi.fn().mockResolvedValue(undefined);
  const onRemove = vi.fn();
  const utils = render(<ImageUploadZone label="Cover image" imageUrl={RESULT} aspect="banner" onUpload={onUpload} onRemove={onRemove} {...over} />);
  return { onUpload, onRemove, ...utils };
}
/** The picture inside the open crop dialog, "loaded" at 1600 x 1000. */
const loadPicture = async () => {
  const dialog = await screen.findByRole('dialog');
  const img = dialog.querySelector('img')!;
  fireEvent.load(img);
  return { dialog, img };
};

describe('the crop icon on a chosen picture', () => {
  const fetchMock = vi.fn();
  const realRO = globalThis.ResizeObserver;
  beforeEach(() => {
    toast.mockReset();
    fetchMock.mockReset().mockResolvedValue({ ok: true, blob: async () => new Blob(['x'], { type: 'image/png' }) });
    vi.stubGlobal('fetch', fetchMock);
    URL.createObjectURL = vi.fn(() => 'blob:crop-preview');
    URL.revokeObjectURL = vi.fn();
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(1600);
    vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(1000);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800);
    HTMLImageElement.prototype.decode = vi.fn().mockResolvedValue(undefined);
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ fillRect: vi.fn(), drawImage: vi.fn() })) as never;
    HTMLCanvasElement.prototype.toBlob = vi.fn((cb: BlobCallback) => cb(new Blob(['cropped'], { type: 'image/jpeg' }))) as never;
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    globalThis.ResizeObserver = realRO;
  });

  it('sits next to the remove icon, and only when there is a picture', () => {
    draw();
    expect(screen.getByRole('button', { name: 'Crop cover image' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Remove cover image' })).toBeInTheDocument();
  });

  it('is not there for an empty zone', () => {
    draw({ imageUrl: undefined });
    expect(screen.queryByRole('button', { name: 'Crop cover image' })).not.toBeInTheDocument();
  });

  it('a picture with no remembered crop opens as it is, at 100%, with the shapes to choose from', async () => {
    const { onRemove } = draw();
    await userEvent.click(screen.getByRole('button', { name: 'Crop cover image' }));
    expect(fetchMock).toHaveBeenCalledWith(`/api/backend${RESULT}`);
    const { dialog } = await loadPicture();
    expect(within(dialog).getByRole('slider')).toHaveAttribute('aria-valuetext', '100%');
    const shapes = within(dialog).getByRole('group', { name: 'Shape' });
    expect(within(shapes).getAllByRole('button').map((b) => b.textContent)).toEqual(['Wide banner', 'Landscape', 'Photo', 'Square']);
    expect(within(shapes).getByRole('button', { name: 'Wide banner' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(within(shapes).getByRole('button', { name: 'Square' }));
    expect(within(shapes).getByRole('button', { name: 'Square' })).toHaveAttribute('aria-pressed', 'true');
    expect(onRemove).not.toHaveBeenCalled();
  });

  it('a remembered crop reopens on the ORIGINAL picture at the zoom, place and shape it was left at (178%, not 100%)', async () => {
    draw({ cropMemo: MEMO });
    await userEvent.click(screen.getByRole('button', { name: 'Crop cover image' }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`/api/backend${ORIGINAL}`); // the original, not the cropped result
    const { dialog, img } = await loadPicture();
    expect(within(dialog).getByRole('slider')).toHaveAttribute('aria-valuetext', '178%');
    expect(within(dialog).getByText('178%')).toBeInTheDocument();
    // the shape it was left at
    expect(within(dialog).getByRole('button', { name: 'Wide banner' })).toHaveAttribute('aria-pressed', 'true');
    // and the place: the picture is moved so the centre of the part kept (30% across, 60% down) is in the middle of the frame
    await waitFor(() => expect(img.style.transform).not.toBe('translate(calc(-50% + 0px), calc(-50% + 0px))'));
  });

  it('a remembered crop that belongs to another picture is ignored', async () => {
    draw({ cropMemo: { ...MEMO, result: '/api/upload/file/u1/f1/brand/something-else.jpg' } });
    await userEvent.click(screen.getByRole('button', { name: 'Crop cover image' }));
    expect(fetchMock).toHaveBeenCalledWith(`/api/backend${RESULT}`);
    const { dialog } = await loadPicture();
    expect(within(dialog).getByRole('slider')).toHaveAttribute('aria-valuetext', '100%');
  });

  it('a new upload keeps its original, then uploads the crop with how it was framed and where the original is', async () => {
    const onUploadSource = vi.fn().mockResolvedValue('/api/upload/file/u1/f1/brand/keep-original.png');
    const { onUpload, container } = draw({ imageUrl: undefined, onUploadSource });
    const file = new File(['pic'], 'me.png', { type: 'image/png' });
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [file] } });
    const { dialog } = await loadPicture();
    fireEvent.change(within(dialog).getByRole('slider'), { target: { value: '1.78' } });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Use this crop' }));
    await waitFor(() => expect(onUpload).toHaveBeenCalled());
    expect(onUploadSource).toHaveBeenCalledWith(file);
    const [cropped, frame] = onUpload.mock.calls[0];
    expect(cropped).toBeInstanceOf(File);
    expect(frame).toMatchObject({ aspect: 3.2, zoom: 1.78, from: '/api/upload/file/u1/f1/brand/keep-original.png' });
    expect(frame.fx).toBeCloseTo(0.5, 3);
    expect(frame.fy).toBeCloseTo(0.5, 3);
  });

  it('adjusting a remembered crop uploads the new crop, still from the same original', async () => {
    const { onUpload } = draw({ cropMemo: MEMO });
    await userEvent.click(screen.getByRole('button', { name: 'Crop cover image' }));
    const { dialog } = await loadPicture();
    fireEvent.change(within(dialog).getByRole('slider'), { target: { value: '2.5' } });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Use this crop' }));
    await waitFor(() => expect(onUpload).toHaveBeenCalled());
    expect(onUpload.mock.calls[0][1]).toMatchObject({ from: ORIGINAL, aspect: 3.2, zoom: 2.5 });
  });

  it('a crop of a picture with no original kept (a page that cannot keep one) goes up without a memo', async () => {
    const { onUpload, container } = draw({ imageUrl: undefined });
    fireEvent.change(container.querySelector('input[type=file]')!, { target: { files: [new File(['pic'], 'me.png', { type: 'image/png' })] } });
    const { dialog } = await loadPicture();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Use this crop' }));
    await waitFor(() => expect(onUpload).toHaveBeenCalled());
    expect(onUpload.mock.calls[0][1]).toBeUndefined();
  });

  it('a freeform zone (the page background) starts on Landscape', async () => {
    draw({ label: 'Page background image', freeform: true });
    await userEvent.click(screen.getByRole('button', { name: 'Crop page background image' }));
    const { dialog } = await loadPicture();
    expect(within(dialog).getByRole('button', { name: 'Landscape' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('works for a built-in picture', async () => {
    draw({ imageUrl: '/form-pictures/aurora-mint.jpg' });
    await userEvent.click(screen.getByRole('button', { name: 'Crop cover image' }));
    expect(fetchMock).toHaveBeenCalledWith('/form-pictures/aurora-mint.jpg');
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });

  it('says so when the picture cannot be read back', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    draw();
    await userEvent.click(screen.getByRole('button', { name: 'Crop cover image' }));
    expect(toast).toHaveBeenCalledWith('Could not open this picture to crop it. Upload it again to crop it.', 'error');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('a logo is cropped to a square, with no shapes to choose from', async () => {
    draw({ label: 'Logo', aspect: 'square', imageUrl: RESULT });
    await userEvent.click(screen.getByRole('button', { name: 'Crop logo' }));
    const dialog = await screen.findByRole('dialog', { name: 'Crop your logo' });
    expect(within(dialog).queryByRole('group', { name: 'Shape' })).not.toBeInTheDocument();
  });

  it('a logo reopens on its original at 178% too', async () => {
    draw({ label: 'Logo', aspect: 'square', imageUrl: RESULT, cropMemo: { ...MEMO, aspect: 1 } });
    await userEvent.click(screen.getByRole('button', { name: 'Crop logo' }));
    expect(fetchMock).toHaveBeenCalledWith(`/api/backend${ORIGINAL}`);
    const { dialog } = await loadPicture();
    expect(within(dialog).getByRole('slider')).toHaveAttribute('aria-valuetext', '178%');
  });
});

describe('a photo from Unsplash: cropped by its address, still linked', () => {
  const photo = 'https://images.unsplash.com/photo-1?w=1920&q=75&fit=max&auto=format';
  const realRO = globalThis.ResizeObserver;
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
    vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(1600);
    vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(1000);
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    globalThis.ResizeObserver = realRO;
  });

  it('the icon is on, opens the whole photo from Unsplash itself (nothing copied), and the crop comes back as a new address', async () => {
    const onUrlChange = vi.fn();
    draw({ imageUrl: photo, onUrlChange });
    const icon = screen.getByRole('button', { name: 'Crop cover image' });
    expect(icon).toBeEnabled();
    await userEvent.click(icon);
    expect(fetch).not.toHaveBeenCalled();
    const { dialog, img } = await loadPicture();
    expect(img.getAttribute('src')).toMatch(/^https:\/\/images\.unsplash\.com\/photo-1\?.*fit=max/);
    fireEvent.change(within(dialog).getByRole('slider'), { target: { value: '2' } });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Use this crop' }));
    expect(onUrlChange).toHaveBeenCalledTimes(1);
    const u = new URL(onUrlChange.mock.calls[0][0]);
    expect(u.origin + u.pathname).toBe('https://images.unsplash.com/photo-1');
    expect(Object.fromEntries(u.searchParams)).toMatchObject({ fit: 'crop', crop: 'focalpoint', 'fp-x': '0.500', 'fp-y': '0.500', 'fp-z': '2', w: '1600', h: '500', q: '75' });
  });

  it('a photo that is already cropped opens on the whole photo at the crop it has (zoom 178%)', async () => {
    const cropped = `${photo}&crop=focalpoint&fp-x=0.300&fp-y=0.600&fp-z=1.78&w=1600&h=500`;
    draw({ imageUrl: cropped, onUrlChange: vi.fn() });
    await userEvent.click(screen.getByRole('button', { name: 'Crop cover image' }));
    const { dialog, img } = await loadPicture();
    expect(img.getAttribute('src')).not.toContain('crop=focalpoint'); // the whole photo, to adjust
    expect(within(dialog).getByRole('slider')).toHaveAttribute('aria-valuetext', '178%');
  });

  it('has no icon to use when the page cannot change the address (so nothing is offered that would copy it)', () => {
    draw({ imageUrl: photo });
    expect(screen.getByRole('button', { name: 'Crop cover image' })).toBeDisabled();
  });

  it('is switched off for a picture from another site, with the reason', () => {
    draw({ imageUrl: 'https://example.com/pic.jpg' });
    const icon = screen.getByRole('button', { name: 'Crop cover image' });
    expect(icon).toBeDisabled();
    expect(icon).toHaveAttribute('title', expect.stringMatching(/another site/));
  });
});
