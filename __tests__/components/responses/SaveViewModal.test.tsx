/**
 * __tests__/components/responses/SaveViewModal.test.tsx
 * sprint-12-inbox-collaboration, requirements.md §7.6 (6.1), task 2.6.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SaveViewModal } from '@/components/responses/SaveViewModal';

describe('SaveViewModal', () => {
  it('does not render when closed', () => {
    render(<SaveViewModal isOpen={false} onClose={vi.fn()} canCreateTeamView isSaving={false} onSave={vi.fn()} />);
    expect(screen.queryByText('Save view')).not.toBeInTheDocument();
  });

  it('defaults to Personal visibility', () => {
    render(<SaveViewModal isOpen onClose={vi.fn()} canCreateTeamView isSaving={false} onSave={vi.fn()} />);
    expect(screen.getByLabelText(/personal/i)).toBeChecked();
  });

  it('offers Team only when canCreateTeamView is true', () => {
    const { rerender } = render(<SaveViewModal isOpen onClose={vi.fn()} canCreateTeamView={false} isSaving={false} onSave={vi.fn()} />);
    expect(screen.queryByLabelText(/team/i)).not.toBeInTheDocument();

    rerender(<SaveViewModal isOpen onClose={vi.fn()} canCreateTeamView isSaving={false} onSave={vi.fn()} />);
    expect(screen.getByLabelText(/team/i)).toBeInTheDocument();
  });

  it('validates the name and calls onSave with the form values', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SaveViewModal isOpen onClose={vi.fn()} canCreateTeamView isSaving={false} onSave={onSave} />);

    await user.click(screen.getByRole('button', { name: 'Save view' }));
    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Name'), 'Needs screening');
    await user.click(screen.getByLabelText(/team/i));
    await user.click(screen.getByRole('button', { name: 'Save view' }));

    expect(onSave).toHaveBeenCalledWith({ name: 'Needs screening', visibility: 'team' });
  });

  it('Cancel resets the form and closes', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<SaveViewModal isOpen onClose={onClose} canCreateTeamView isSaving={false} onSave={vi.fn()} />);
    await user.type(screen.getByLabelText('Name'), 'Draft');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});
