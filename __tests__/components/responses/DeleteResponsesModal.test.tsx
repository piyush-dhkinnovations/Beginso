import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DeleteResponsesModal } from '@/components/responses/DeleteResponsesModal';
import type { ConfirmDeleteState } from '@/components/responses/useInboxSelection';

const single: ConfirmDeleteState = { mode: 'single', target: { ids: ['a'] }, count: 1 };
const bulk: ConfirmDeleteState = { mode: 'bulk', target: { ids: ['a', 'b', 'c'] }, count: 3 };

describe('DeleteResponsesModal', () => {
  it('renders nothing when there is no pending delete', () => {
    render(<DeleteResponsesModal confirmDelete={null} isDeleting={false} onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // QA A6-009: single delete used to claim "permanently ... cannot be undone" although it moves the response to Trash for 30 days.
  it('says the single delete moves the response to Trash for 30 days, not that it is permanent', () => {
    render(<DeleteResponsesModal confirmDelete={single} isDeleting={false} onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Delete this response?' })).toBeInTheDocument();
    expect(screen.getByText(/moves the response to Trash/)).toBeInTheDocument();
    expect(screen.getByText(/deleted for good after 30 days/)).toBeInTheDocument();
    expect(screen.queryByText(/cannot be undone/)).not.toBeInTheDocument();
  });

  it('shows the count and the undo hint for a bulk delete', () => {
    render(<DeleteResponsesModal confirmDelete={bulk} isDeleting={false} onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'Delete 3 responses?' })).toBeInTheDocument();
    expect(screen.getByText(/move to Trash/)).toBeInTheDocument();
    expect(screen.getByText(/undo right away from the toast/)).toBeInTheDocument();
  });

  it('fires onConfirm and onClose from the buttons', async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<DeleteResponsesModal confirmDelete={single} isDeleting={false} onClose={onClose} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables both actions while deleting', async () => {
    const onConfirm = vi.fn();
    render(<DeleteResponsesModal confirmDelete={single} isDeleting onClose={vi.fn()} onConfirm={onConfirm} />);
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
    const del = screen.getByRole('button', { name: 'Delete' });
    expect(del).toBeDisabled();
    expect(del).toHaveAttribute('aria-busy', 'true');
    await userEvent.click(del);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
