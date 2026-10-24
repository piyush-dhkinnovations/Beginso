import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponsesHeaderActions } from '@/components/responses/ResponsesHeaderActions';

vi.mock('@/components/responses/SavedViewSelect', () => ({
  SavedViewSelect: ({ currentUserId }: { currentUserId: string }) => <div data-testid="saved-views">views for {currentUserId}</div>,
}));

const base = {
  views: [],
  currentUserId: 'u1',
  stages: [],
  role: 'owner' as const,
  onApply: vi.fn(),
  onClearApplied: vi.fn(),
  onRename: vi.fn(),
  onDelete: vi.fn(),
  onExport: vi.fn(),
  onSaveView: vi.fn(),
};

describe('ResponsesHeaderActions', () => {
  it('in a workspace shows the view picker, Export and Save view', () => {
    render(<ResponsesHeaderActions {...base} isWorkspace canExport />);
    expect(screen.getByTestId('saved-views')).toHaveTextContent('views for u1');
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save view' })).toBeInTheDocument();
  });

  it('in personal scope hides saved views and Save view', () => {
    render(<ResponsesHeaderActions {...base} isWorkspace={false} canExport />);
    expect(screen.queryByTestId('saved-views')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save view' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export' })).toBeInTheDocument();
  });

  it('hides Export when the user cannot export', () => {
    render(<ResponsesHeaderActions {...base} isWorkspace canExport={false} />);
    expect(screen.queryByRole('button', { name: 'Export' })).not.toBeInTheDocument();
  });

  it('fires the callbacks', async () => {
    const onExport = vi.fn();
    const onSaveView = vi.fn();
    render(<ResponsesHeaderActions {...base} isWorkspace canExport onExport={onExport} onSaveView={onSaveView} />);
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));
    await userEvent.click(screen.getByRole('menuitem', { name: /Spreadsheet/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Save view' }));
    expect(onExport).toHaveBeenCalledWith('csv');
    expect(onSaveView).toHaveBeenCalledTimes(1);
  });
});
