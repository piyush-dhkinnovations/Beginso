import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/components/dashboard-grid/DashboardGrid', () => ({
  DashboardGrid: ({ widgets, onChange }: { widgets: unknown[]; onChange?: (w: unknown[]) => void }) => (
    <div data-testid="grid" data-count={widgets.length} data-editing={String(!!onChange)}>
      {onChange && <button onClick={() => onChange(widgets.slice(1))}>drop-first</button>}
    </div>
  ),
}));
vi.mock('@/components/dashboard-grid/AddWidgetDrawer', () => ({
  AddWidgetDrawer: ({ isOpen, onAdd }: { isOpen: boolean; onAdd: (w: unknown) => void }) =>
    isOpen ? <button onClick={() => onAdd({ w: 3, config: { type: 'kpi', variant: 1, metric: 'totalForms' } })}>pick</button> : null,
}));

import { DashboardDemo } from '@/components/dashboard-grid/DashboardDemo';

describe('DashboardDemo', () => {
  it('starts in view mode with the six default widgets', () => {
    render(<DashboardDemo />);
    expect(screen.getByRole('heading', { name: /Dashboard grid/ })).toBeInTheDocument();
    expect(screen.getByTestId('grid')).toHaveAttribute('data-count', '6');
    expect(screen.getByTestId('grid')).toHaveAttribute('data-editing', 'false');
    expect(screen.queryByRole('button', { name: 'Save' })).not.toBeInTheDocument();
  });

  it('cancel discards edits', async () => {
    const user = userEvent.setup();
    render(<DashboardDemo />);
    await user.click(screen.getByRole('button', { name: 'Customize' }));
    await user.click(screen.getByRole('button', { name: 'drop-first' }));
    expect(screen.getByTestId('grid')).toHaveAttribute('data-count', '5');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.getByTestId('grid')).toHaveAttribute('data-count', '6');
  });

  it('save keeps edits, and adding a widget appends it', async () => {
    const user = userEvent.setup();
    render(<DashboardDemo />);
    await user.click(screen.getByRole('button', { name: 'Customize' }));
    await user.click(screen.getByRole('button', { name: /Add widget/ }));
    await user.click(screen.getByRole('button', { name: 'pick' }));
    expect(screen.getByTestId('grid')).toHaveAttribute('data-count', '7');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByTestId('grid')).toHaveAttribute('data-editing', 'false');
    expect(screen.getByTestId('grid')).toHaveAttribute('data-count', '7');
  });

  it('reset to default restores the six widgets', async () => {
    const user = userEvent.setup();
    render(<DashboardDemo />);
    await user.click(screen.getByRole('button', { name: 'Customize' }));
    await user.click(screen.getByRole('button', { name: 'drop-first' }));
    await user.click(screen.getByRole('button', { name: 'Reset to default' }));
    expect(screen.getByTestId('grid')).toHaveAttribute('data-count', '6');
  });
});
