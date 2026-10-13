import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormLogoButton } from '@/components/forms/FormLogoButton';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
// The real picker uploads files; here it just offers "pick" / "remove" buttons that drive onChange.
vi.mock('@/components/flow/LogoChoice', () => ({
  LogoChoice: ({ value, onChange }: { value: string | null; onChange: (v: string | null) => void }) => (
    <div>
      <span data-testid="draft">{value ?? 'none'}</span>
      <button onClick={() => onChange('/new.png')}>pick</button>
      <button onClick={() => onChange(null)}>remove</button>
    </div>
  ),
}));

describe('FormLogoButton', () => {
  it('without edit rights shows only the tile (no button)', () => {
    const { container } = render(<FormLogoButton logoUrl="/a.png" canEdit={false} onSave={vi.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('src', '/a.png');
  });

  it('shows the default document icon when there is no logo', () => {
    const { container } = render(<FormLogoButton onSave={vi.fn()} canEdit={false} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('with edit rights, opens a dialog seeded with the current logo', async () => {
    render(<FormLogoButton logoUrl="/a.png" onSave={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Change form logo' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('draft')).toHaveTextContent('/a.png');
  });

  it('Save is disabled until the draft differs from the current logo', async () => {
    render(<FormLogoButton logoUrl="/a.png" onSave={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Change form logo' }));
    expect(screen.getByRole('button', { name: 'Save logo' })).toBeDisabled();
    await userEvent.click(screen.getByText('pick'));
    expect(screen.getByRole('button', { name: 'Save logo' })).toBeEnabled();
  });

  it('saves the new logo and closes the dialog', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<FormLogoButton logoUrl="/a.png" onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: 'Change form logo' }));
    await userEvent.click(screen.getByText('pick'));
    await userEvent.click(screen.getByRole('button', { name: 'Save logo' }));
    expect(onSave).toHaveBeenCalledWith('/new.png');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('removing the logo saves null', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<FormLogoButton logoUrl="/a.png" onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: 'Change form logo' }));
    await userEvent.click(screen.getByText('remove'));
    await userEvent.click(screen.getByRole('button', { name: 'Save logo' }));
    expect(onSave).toHaveBeenCalledWith(null);
  });

  it('keeps the dialog open and toasts an error when saving fails', async () => {
    toast.mockClear();
    const onSave = vi.fn().mockRejectedValue(new Error('x'));
    render(<FormLogoButton onSave={onSave} />);
    await userEvent.click(screen.getByRole('button', { name: 'Change form logo' }));
    await userEvent.click(screen.getByText('pick'));
    await userEvent.click(screen.getByRole('button', { name: 'Save logo' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Could not save the logo. Please try again.', 'error'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save logo' })).toBeEnabled();
  });

  it('Cancel closes and a reopen re-seeds the draft from the saved logo', async () => {
    render(<FormLogoButton logoUrl="/a.png" onSave={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Change form logo' }));
    await userEvent.click(screen.getByText('pick'));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await userEvent.click(screen.getByRole('button', { name: 'Change form logo' }));
    expect(screen.getByTestId('draft')).toHaveTextContent('/a.png');
  });
});
