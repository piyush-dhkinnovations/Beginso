import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EmptyTrashModal } from '@/components/trash/EmptyTrashModal';

const setup = (over: Partial<React.ComponentProps<typeof EmptyTrashModal>> = {}) => {
  const props = { isOpen: true, onClose: vi.fn(), onConfirm: vi.fn(), isPending: false, ...over };
  const utils = render(<EmptyTrashModal {...props} />);
  return { props, ...utils };
};

const confirmBtn = () => screen.getByRole('button', { name: 'Delete permanently' });
const input = () => screen.getByLabelText('Type DELETE to confirm');

describe('EmptyTrashModal', () => {
  it('renders nothing when closed', () => {
    setup({ isOpen: false });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the default title and the irreversible warning', () => {
    setup();
    expect(screen.getByRole('heading', { name: 'Permanently delete' })).toBeInTheDocument();
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
    expect(screen.getByText(/analytics history will be destroyed/)).toBeInTheDocument();
  });

  it('uses custom title, detail and confirm label', () => {
    setup({ title: 'Empty trash', detail: 'All 4 items go.', confirmLabel: 'Empty trash' });
    expect(screen.getByRole('heading', { name: 'Empty trash' })).toBeInTheDocument();
    expect(screen.getByText(/All 4 items go\./)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Empty trash' })).toBeInTheDocument();
  });

  it('keeps the confirm button disabled until DELETE is typed exactly', async () => {
    setup();
    expect(confirmBtn()).toBeDisabled();
    await userEvent.type(input(), 'delete');
    expect(confirmBtn()).toBeDisabled();
    await userEvent.clear(input());
    await userEvent.type(input(), 'DELETE ');
    expect(confirmBtn()).toBeDisabled();
    await userEvent.clear(input());
    await userEvent.type(input(), 'DELETE');
    expect(confirmBtn()).toBeEnabled();
  });

  it('confirms by clicking and by pressing Enter in the field', async () => {
    const { props } = setup();
    await userEvent.type(input(), 'DELETE');
    await userEvent.click(confirmBtn());
    expect(props.onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.type(input(), '{Enter}');
    expect(props.onConfirm).toHaveBeenCalledTimes(2);
  });

  it('Enter without the right text does nothing', async () => {
    const { props } = setup();
    await userEvent.type(input(), 'nope{Enter}');
    expect(props.onConfirm).not.toHaveBeenCalled();
  });

  it('does not confirm while pending, and Cancel is disabled', async () => {
    const { props } = setup({ isPending: true });
    await userEvent.type(input(), 'DELETE{Enter}');
    expect(props.onConfirm).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('Cancel calls onClose', async () => {
    const { props } = setup();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('forgets the typed text when reopened', async () => {
    const { rerender, props } = setup();
    await userEvent.type(input(), 'DELETE');
    rerender(<EmptyTrashModal {...props} isOpen={false} />);
    rerender(<EmptyTrashModal {...props} isOpen />);
    expect(input()).toHaveValue('');
    expect(confirmBtn()).toBeDisabled();
  });
});
