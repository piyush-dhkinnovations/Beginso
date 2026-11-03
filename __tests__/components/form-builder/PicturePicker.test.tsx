/**
 * Choosing a picture from the app's library: a few to pick at once, the whole library by kind, the chosen one marked, nothing sent until one is picked.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PictureChoice } from '@/components/form-builder/PicturePicker';
import { FORM_PICTURES } from '@/lib/formPictures';
import { PhotosError, unsplashService, type UnsplashPhoto } from '@/services/unsplash';

vi.mock('@/services/unsplash', async (orig) => ({ ...(await orig<typeof import('@/services/unsplash')>()), unsplashService: { featured: vi.fn(), search: vi.fn(), download: vi.fn() } }));
const svc = unsplashService as unknown as Record<'featured' | 'search' | 'download', ReturnType<typeof vi.fn>>;
beforeEach(() => {
  svc.featured.mockReset().mockResolvedValue([]);
  svc.search.mockReset();
  svc.download.mockReset().mockResolvedValue(undefined);
});

const photo = (id: string, name: string): UnsplashPhoto => ({ id, thumb: `https://images.unsplash.com/${id}?w=400`, url: `https://images.unsplash.com/${id}?w=1920`, alt: '', credit: { name, url: `https://unsplash.com/@${id}` } });

function draw(value?: string) {
  const onPick = vi.fn();
  render(<PictureChoice label="Pictures to choose from" value={value} onPick={onPick} />);
  return onPick;
}

describe('PictureChoice', () => {
  it('shows five pictures and a way to see them all, and picking one sends its path', async () => {
    const onPick = draw();
    const group = screen.getByRole('group', { name: 'Pictures to choose from' });
    expect(within(group).getAllByRole('button', { pressed: false })).toHaveLength(5);
    expect(within(group).getByRole('button', { name: 'All pictures' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: FORM_PICTURES[1].name }));
    expect(onPick).toHaveBeenCalledWith(`/form-pictures/${FORM_PICTURES[1].id}.jpg`);
  });

  it('marks the chosen picture and puts it in front when it is further down the library', () => {
    const last = FORM_PICTURES[FORM_PICTURES.length - 1];
    draw(`/form-pictures/${last.id}.jpg`);
    expect(screen.getByRole('button', { name: last.name })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('button', { name: last.name })).toHaveLength(1);
  });

  it('marks nothing for an uploaded picture or no picture', () => {
    draw('/api/upload/file/u1/f1/brand/pic.png');
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0);
  });

  it('opens the whole library, filters by kind, and closes after a pick', async () => {
    const onPick = draw();
    await userEvent.click(screen.getByRole('button', { name: 'All pictures' }));
    const dialog = screen.getByRole('dialog', { name: 'Choose a picture' });
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(FORM_PICTURES.length);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Dark' }));
    const dark = FORM_PICTURES.filter((p) => p.group === 'dark');
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(dark.length);
    await userEvent.click(within(dialog).getByRole('button', { name: dark[0].name }));
    expect(onPick).toHaveBeenCalledWith(`/form-pictures/${dark[0].id}.jpg`);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('every preview picture is decoration (the button carries the name)', async () => {
    draw();
    await userEvent.click(screen.getByRole('button', { name: 'All pictures' }));
    const dialog = screen.getByRole('dialog');
    for (const img of dialog.querySelectorAll('img')) expect(img).toHaveAttribute('alt', '');
  });

  describe('Photos from Unsplash', () => {
    const open = async () => {
      const onPick = draw();
      await userEvent.click(screen.getByRole('button', { name: 'All pictures' }));
      await userEvent.click(screen.getByRole('tab', { name: 'Photos from Unsplash' }));
      return { onPick, dialog: screen.getByRole('dialog') };
    };

    it('shows the ready photos with the photographer, and picking one sends the picture, the credit, and tells Unsplash', async () => {
      svc.featured.mockResolvedValue([photo('aaaaaa1', 'Ada'), photo('bbbbbb2', 'Bo')]);
      const { onPick, dialog } = await open();
      expect(await within(dialog).findByText('Photo by Ada')).toBeInTheDocument();
      await userEvent.click(within(dialog).getAllByRole('button', { pressed: false }).find((b) => b.getAttribute('aria-label') === 'Photo by Ada')!);
      expect(onPick).toHaveBeenCalledWith('https://images.unsplash.com/aaaaaa1?w=1920', { name: 'Ada', url: 'https://unsplash.com/@aaaaaa1' });
      expect(svc.download).toHaveBeenCalledWith('aaaaaa1');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('searches, and loads more of the same search', async () => {
      svc.search.mockResolvedValueOnce({ photos: [photo('cccccc3', 'Cy')], page: 1, totalPages: 2 }).mockResolvedValueOnce({ photos: [photo('dddddd4', 'Di')], page: 2, totalPages: 2 });
      const { dialog } = await open();
      await userEvent.type(within(dialog).getByRole('searchbox', { name: 'Search photos' }), 'leaves{Enter}');
      expect(svc.search).toHaveBeenCalledWith('leaves', 1);
      expect(await within(dialog).findByText('Photo by Cy')).toBeInTheDocument();
      await userEvent.click(within(dialog).getByRole('button', { name: 'Load more' }));
      expect(svc.search).toHaveBeenLastCalledWith('leaves', 2);
      expect(await within(dialog).findByText('Photo by Di')).toBeInTheDocument();
      expect(within(dialog).getByText('Photo by Cy')).toBeInTheDocument();
      expect(within(dialog).queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument();
    });

    it('says when photos are not available or search is busy, and when nothing was found', async () => {
      svc.featured.mockRejectedValue(new PhotosError('off', 'x'));
      const { dialog } = await open();
      expect(await within(dialog).findByRole('alert')).toHaveTextContent(/not available/i);
      svc.search.mockRejectedValueOnce(new PhotosError('busy', 'x')).mockResolvedValueOnce({ photos: [], page: 1, totalPages: 1 });
      await userEvent.type(within(dialog).getByRole('searchbox'), 'sky{Enter}');
      expect(await within(dialog).findByRole('alert')).toHaveTextContent(/busy/i);
      await userEvent.click(within(dialog).getByRole('button', { name: 'Search' }));
      expect(await within(dialog).findByText(/No photos found/)).toBeInTheDocument();
    });
  });
});
