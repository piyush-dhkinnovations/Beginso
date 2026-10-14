import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormLogoButton } from '@/components/forms/FormLogoButton';

const toast = vi.hoisted(() => vi.fn());
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast }) }));
// The real picker has its own tests; here it just offers buttons that drive onChange.
vi.mock('@/components/forms/FormMarkPicker', () => ({
  FormMarkPicker: ({ value, onChange }: { value: { logoUrl?: string | null; iconName?: string | null }; onChange: (v: object) => void }) => (
    <div>
      <span data-testid="draft">{value.logoUrl ?? value.iconName ?? 'none'}</span>
      <button onClick={() => onChange({ logoUrl: '/new.png', iconName: null })}>pick-logo</button>
      <button onClick={() => onChange({ logoUrl: null, iconName: 'rocket' })}>pick-icon</button>
      <button onClick={() => onChange({ logoUrl: null, iconName: null })}>auto</button>
    </div>
  ),
}));

const open = () => userEvent.click(screen.getByRole('button', { name: 'Change form icon' }));

describe('FormLogoButton', () => {
  it('without edit rights shows only the mark (no button)', () => {
    const { container } = render(<FormLogoButton mark={{ logoUrl: '/a.png' }} title="T" canEdit={false} onSave={vi.fn()} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(container.querySelector('img')).toHaveAttribute('src', '/a.png');
  });

  it('shows an icon chosen from the form name when there is no logo or icon', () => {
    const { container } = render(<FormLogoButton mark={{}} title="Event Registration" onSave={vi.fn()} canEdit={false} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('shows the chosen icon, alone (no box around it)', () => {
    const picked = render(<FormLogoButton mark={{ iconName: 'rating-star' }} title="T" canEdit={false} onSave={vi.fn()} />).container;
    const auto = render(<FormLogoButton mark={{}} title="T" canEdit={false} onSave={vi.fn()} />).container;
    expect(picked.querySelector('svg')).not.toBeNull();
    expect(picked.innerHTML).not.toBe(auto.innerHTML);
    expect((picked.firstElementChild as HTMLElement).className).not.toMatch(/border|bg-/);
  });

  it('with edit rights, opens a dialog seeded with the current mark', async () => {
    render(<FormLogoButton mark={{ logoUrl: '/a.png' }} title="T" onSave={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await open();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByTestId('draft')).toHaveTextContent('/a.png');
  });

  it('Save is disabled until the draft differs from the current mark', async () => {
    render(<FormLogoButton mark={{ logoUrl: '/a.png' }} title="T" onSave={vi.fn()} />);
    await open();
    expect(screen.getByRole('button', { name: 'Save icon' })).toBeDisabled();
    await userEvent.click(screen.getByText('pick-logo'));
    expect(screen.getByRole('button', { name: 'Save icon' })).toBeEnabled();
  });

  it('saves a new logo and closes the dialog', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<FormLogoButton mark={{ logoUrl: '/a.png' }} title="T" onSave={onSave} />);
    await open();
    await userEvent.click(screen.getByText('pick-logo'));
    await userEvent.click(screen.getByRole('button', { name: 'Save icon' }));
    expect(onSave).toHaveBeenCalledWith({ logoUrl: '/new.png', iconName: null });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('saves a picked icon and colour', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<FormLogoButton mark={{}} title="T" onSave={onSave} />);
    await open();
    await userEvent.click(screen.getByText('pick-icon'));
    await userEvent.click(screen.getByRole('button', { name: 'Save icon' }));
    expect(onSave).toHaveBeenCalledWith({ logoUrl: null, iconName: 'rocket' });
  });

  it('going back to Automatic saves an empty mark', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<FormLogoButton mark={{ logoUrl: '/a.png' }} title="T" onSave={onSave} />);
    await open();
    await userEvent.click(screen.getByText('auto'));
    await userEvent.click(screen.getByRole('button', { name: 'Save icon' }));
    expect(onSave).toHaveBeenCalledWith({ logoUrl: null, iconName: null });
  });

  it('keeps the dialog open and toasts an error when saving fails', async () => {
    toast.mockClear();
    const onSave = vi.fn().mockRejectedValue(new Error('x'));
    render(<FormLogoButton mark={{}} title="T" onSave={onSave} />);
    await open();
    await userEvent.click(screen.getByText('pick-logo'));
    await userEvent.click(screen.getByRole('button', { name: 'Save icon' }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith('Could not save the icon. Please try again.', 'error'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save icon' })).toBeEnabled();
  });

  it('Cancel closes and a reopen re-seeds the draft from the saved mark', async () => {
    render(<FormLogoButton mark={{ logoUrl: '/a.png' }} title="T" onSave={vi.fn()} />);
    await open();
    await userEvent.click(screen.getByText('pick-icon'));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    await open();
    expect(screen.getByTestId('draft')).toHaveTextContent('/a.png');
  });
});
