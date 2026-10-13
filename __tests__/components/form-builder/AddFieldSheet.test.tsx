import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddFieldSheet } from '@/components/form-builder/AddFieldSheet';
import { FIELD_GROUPS, FIELD_TYPE_CONFIG } from '@/components/form-builder/Toolbox';

describe('AddFieldSheet', () => {
  it('renders nothing while closed', () => {
    render(<AddFieldSheet isOpen={false} onClose={vi.fn()} onAdd={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('lists every field type, grouped, under a dialog titled "Add a field"', () => {
    render(<AddFieldSheet isOpen onClose={vi.fn()} onAdd={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Add a field')).toBeInTheDocument();
    for (const g of FIELD_GROUPS) {
      expect(screen.getByRole('region', { name: g.label })).toBeInTheDocument();
    }
    expect(within(dialog).getAllByRole('button').filter((b) => b.textContent && FIELD_TYPE_CONFIG.some((c) => c.label === b.textContent))).toHaveLength(FIELD_TYPE_CONFIG.length);
  });

  it('choosing a field adds it by type and closes the sheet', async () => {
    const onAdd = vi.fn();
    const onClose = vi.fn();
    render(<AddFieldSheet isOpen onClose={onClose} onAdd={onAdd} />);
    await userEvent.click(screen.getByRole('button', { name: 'Email' }));
    expect(onAdd).toHaveBeenCalledWith('email');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
