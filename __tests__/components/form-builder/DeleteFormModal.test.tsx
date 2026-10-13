import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteFormModal } from '@/components/form-builder/DeleteFormModal';

const base = { isOpen: true, onClose: vi.fn(), onConfirm: vi.fn(), isDeleting: false };

describe('DeleteFormModal', () => {
  it('renders nothing while closed', () => {
    render(<DeleteFormModal {...base} isOpen={false} formTitle="X" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('single mode names the form and the response count', () => {
    render(<DeleteFormModal {...base} formTitle="Survey" responseCount={3} />);
    expect(screen.getByRole('dialog', { name: 'Move form to Trash?' })).toBeInTheDocument();
    expect(screen.getByText('Survey and its 3 responses move to Trash. You can restore them for 30 days.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move to Trash' })).toBeInTheDocument();
  });

  it('single mode uses singular for exactly one response and a generic phrase when unknown', () => {
    const { rerender } = render(<DeleteFormModal {...base} formTitle="Survey" responseCount={1} />);
    expect(screen.getByText(/its 1 response move/)).toBeInTheDocument();
    rerender(<DeleteFormModal {...base} formTitle="Survey" />);
    expect(screen.getByText('Survey and its responses move to Trash. You can restore them for 30 days.')).toBeInTheDocument();
  });

  it('bulk mode is chosen by the count prop (even 1) and pluralises', () => {
    const { rerender } = render(<DeleteFormModal {...base} count={4} />);
    expect(screen.getByRole('dialog', { name: 'Move 4 forms to Trash?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move 4 forms to Trash' })).toBeInTheDocument();
    rerender(<DeleteFormModal {...base} count={1} />);
    expect(screen.getByRole('dialog', { name: 'Move 1 form to Trash?' })).toBeInTheDocument();
  });

  it('Cancel and confirm fire their callbacks', async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(<DeleteFormModal {...base} formTitle="S" onClose={onClose} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: 'Move to Trash' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('while deleting, Cancel is disabled', () => {
    render(<DeleteFormModal {...base} formTitle="S" isDeleting />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });
});
