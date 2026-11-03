/**
 * The Looks dialog: the ready-made gallery, and "My styles" (save the form's look, use, rename, remove), with the server answering or failing.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { LooksDialog, LookPreview } from '@/components/form-builder/LooksDialog';
import { GALLERY_STYLES, type FormStyle } from '@/lib/formStyles';
import type { FormBranding } from '@/types/form';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
const svc = vi.hoisted(() => ({ list: vi.fn(), save: vi.fn(), rename: vi.fn(), remove: vi.fn() }));
vi.mock('@/services/formStyles', () => ({ formStylesService: svc }));

const MINE: FormStyle = { id: 's1', name: 'Our brand', layout: 'steps', branding: { primaryColor: '#0F766E', fontFamily: 'quicksand' } };
const FORM: FormBranding = { primaryColor: '#16A34A', fontFamily: 'lora', logoUrl: '/api/upload/file/u/f/logo.png', bannerText: 'Takes two minutes', coverImageUrl: '/api/upload/file/u/f/cover.png' };

beforeEach(() => {
  vi.clearAllMocks();
  svc.list.mockResolvedValue([MINE]);
});

function draw(over: Partial<React.ComponentProps<typeof LooksDialog>> = {}) {
  const onApply = vi.fn();
  const onClose = vi.fn();
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <LooksDialog isOpen onClose={onClose} layout="classic" branding={FORM} scope="acme" onApply={onApply} {...over} />
    </QueryClientProvider>,
  );
  return { onApply, onClose };
}
const mine = () => userEvent.click(screen.getByRole('tab', { name: 'My styles' }));
const serverError = (status: number, message: string) => Object.assign(new AxiosError('x', 'ERR', undefined, undefined, { status, data: { message } } as never), {});

describe('Ready-made', () => {
  it('shows every ready-made look as a card with a preview, and hands the chosen one over with its name', async () => {
    const { onApply } = draw();
    const dialog = screen.getByRole('dialog', { name: 'Looks' });
    expect(within(dialog).getAllByRole('listitem')).toHaveLength(GALLERY_STYLES.length);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Use the Midnight look' }));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onApply.mock.calls[0][0]).toMatchObject({ id: 'midnight', layout: 'card_stack' });
    expect(onApply.mock.calls[0][1]).toBe('Midnight');
  });

  it('has no "My styles" tab when there is nowhere to keep them', () => {
    draw({ scope: undefined });
    expect(screen.queryByRole('tab', { name: 'My styles' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(GALLERY_STYLES.length);
  });

  it('draws a preview with the look\'s own colours and card, and hides it from a screen reader', () => {
    const { container } = render(<LookPreview look={{ layout: 'classic', branding: { primaryColor: '#B93815', cardStyle: 'bordered' } }} />);
    expect(container.firstElementChild).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('My styles', () => {
  it('lists the saved styles of the scope and uses one', async () => {
    const { onApply } = draw();
    await mine();
    expect(await screen.findByText('Our brand')).toBeInTheDocument();
    expect(svc.list).toHaveBeenCalledWith('acme');
    await userEvent.click(screen.getByRole('button', { name: 'Use the Our brand style' }));
    expect(onApply).toHaveBeenCalledWith(MINE, 'Your style');
  });

  it('says so when there are none, and when they cannot be loaded (with a way to try again)', async () => {
    svc.list.mockResolvedValueOnce([]);
    draw();
    await mine();
    expect(await screen.findByText(/No saved styles yet/)).toBeInTheDocument();
  });

  it('shows a load failure and retries', async () => {
    svc.list.mockRejectedValueOnce(new Error('down')).mockResolvedValueOnce([MINE]);
    draw();
    await mine();
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load your styles');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('Our brand')).toBeInTheDocument();
  });

  it('saves the look of this form without its logo, text or uploads, then clears the name and refreshes', async () => {
    svc.save.mockResolvedValue(MINE);
    draw({ layout: 'guided' });
    await mine();
    await screen.findByText('Our brand');
    const save = screen.getByRole('button', { name: 'Save style' });
    expect(save).toBeDisabled();
    await userEvent.type(screen.getByLabelText("Save this form's look as a style"), '  Spring  ');
    await userEvent.click(save);
    await waitFor(() => expect(svc.save).toHaveBeenCalled());
    expect(svc.save).toHaveBeenCalledWith('acme', { name: 'Spring', layout: 'guided', branding: { primaryColor: '#16A34A', fontFamily: 'lora' } });
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Style saved.', 'success'));
    expect(screen.getByLabelText("Save this form's look as a style")).toHaveValue('');
    await waitFor(() => expect(svc.list.mock.calls.length).toBeGreaterThan(1));
  });

  it('shows the server\'s own words when saving is refused (the limit)', async () => {
    svc.save.mockRejectedValue(serverError(409, 'You can keep up to 20 saved styles. Delete one to save another.'));
    draw();
    await mine();
    await screen.findByText('Our brand');
    await userEvent.type(screen.getByLabelText("Save this form's look as a style"), 'One more');
    await userEvent.click(screen.getByRole('button', { name: 'Save style' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('You can keep up to 20 saved styles. Delete one to save another.', 'error'));
  });

  it('renames in place, and Cancel leaves the name alone', async () => {
    svc.rename.mockResolvedValue(undefined);
    draw();
    await mine();
    await screen.findByText('Our brand');
    await userEvent.click(screen.getByRole('button', { name: 'Rename Our brand' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(svc.rename).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Rename Our brand' }));
    const field = screen.getByLabelText('New name for Our brand');
    await userEvent.clear(field);
    await userEvent.type(field, ' Brand 2 ');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(svc.rename).toHaveBeenCalledWith('acme', 's1', 'Brand 2'));
  });

  it('asks before removing, removes on yes, and keeps it on no', async () => {
    svc.remove.mockResolvedValue(undefined);
    draw();
    await mine();
    await screen.findByText('Our brand');
    await userEvent.click(screen.getByRole('button', { name: 'Remove Our brand' }));
    expect(screen.getByText('Remove this style?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'No' }));
    expect(svc.remove).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Remove Our brand' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, remove' }));
    await waitFor(() => expect(svc.remove).toHaveBeenCalledWith('acme', 's1'));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Style removed.', 'success'));
  });

  it('says a refused change in the server\'s words', async () => {
    svc.remove.mockRejectedValue(serverError(403, 'Only the person who saved a style, or an Owner or Admin, can remove it'));
    draw();
    await mine();
    await screen.findByText('Our brand');
    await userEvent.click(screen.getByRole('button', { name: 'Remove Our brand' }));
    await userEvent.click(screen.getByRole('button', { name: 'Yes, remove' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Only the person who saved a style, or an Owner or Admin, can remove it', 'error'));
  });
});
