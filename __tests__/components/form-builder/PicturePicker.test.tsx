/**
 * Choosing a picture from the app's library: a few to pick at once, the whole library by kind, the chosen one marked, nothing sent until one is picked.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PictureChoice } from '@/components/form-builder/PicturePicker';
import { FORM_PICTURES } from '@/lib/formPictures';

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
});
