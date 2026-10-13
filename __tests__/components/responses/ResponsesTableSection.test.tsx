import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponsesTableSection } from '@/components/responses/ResponsesTableSection';
import type { BulkActionBarProps } from '@/components/responses/BulkActionBar';
import type { IResponse } from '@/types/response';

let barProps: BulkActionBarProps;
let tableProps: {
  onSelectAll: (c: boolean) => void;
  onSelectRow: (id: string, c: boolean) => void;
  onDeleteResponse: (id: string) => void;
  onViewResponse: (id: string) => void;
  formId?: string;
};

vi.mock('@/components/responses/BulkActionBar', () => ({
  BulkActionBar: (p: BulkActionBarProps) => {
    barProps = p;
    return <div data-testid="bulk-bar" />;
  },
}));
vi.mock('@/components/responses/ResponsesTable', () => ({
  ResponsesTable: (p: typeof tableProps) => {
    tableProps = p;
    return <div data-testid="table" />;
  },
}));

const responses = [{ _id: 'a' }, { _id: 'b' }] as unknown as IResponse[];

function setup(over: Record<string, unknown> = {}) {
  const selection = {
    selectedIds: new Set<string>(['a']),
    setSelectedIds: vi.fn(),
    selectAllMatching: false,
    setSelectAllMatching: vi.fn(),
    confirmDelete: null,
    setConfirmDelete: vi.fn(),
    clearSelection: vi.fn(),
  };
  const props = {
    responses,
    isLoading: false,
    selection,
    total: 45,
    page: 2,
    pageLimit: 20,
    formId: 'f1',
    hasActiveFilters: false,
    filterSummary: '',
    otherCount: undefined,
    filters: {},
    stages: [],
    tags: [],
    members: [],
    role: 'owner',
    isBulkRunning: false,
    onBulk: vi.fn(),
    onExport: vi.fn(),
    onClearFilters: vi.fn(),
    onPageChange: vi.fn(),
    onViewResponse: vi.fn(),
    ...over,
  };
  render(<ResponsesTableSection {...(props as unknown as React.ComponentProps<typeof ResponsesTableSection>)} />);
  return { selection, props };
}

describe('ResponsesTableSection', () => {
  it('passes the selection to the bulk bar as an array with the matching total', () => {
    setup();
    expect(barProps.selectedIds).toEqual(['a']);
    expect(barProps.totalMatching).toBe(45);
    expect(barProps.formId).toBe('f1');
    expect(tableProps.formId).toBe('f1');
  });

  it('select-all checks every loaded row and resets select-all-matching', () => {
    const { selection } = setup();
    tableProps.onSelectAll(true);
    expect(selection.setSelectAllMatching).toHaveBeenCalledWith(false);
    expect(selection.setSelectedIds).toHaveBeenCalledWith(new Set(['a', 'b']));
    tableProps.onSelectAll(false);
    expect(selection.setSelectedIds).toHaveBeenLastCalledWith(new Set());
  });

  it('selecting a row adds, deselecting removes, without mutating the previous set', () => {
    const { selection } = setup();
    tableProps.onSelectRow('b', true);
    const add = selection.setSelectedIds.mock.calls[0][0] as (p: Set<string>) => Set<string>;
    const prev = new Set(['a']);
    expect(add(prev)).toEqual(new Set(['a', 'b']));
    expect(prev).toEqual(new Set(['a']));
    tableProps.onSelectRow('a', false);
    const remove = selection.setSelectedIds.mock.calls[1][0] as (p: Set<string>) => Set<string>;
    expect(remove(new Set(['a', 'b']))).toEqual(new Set(['b']));
  });

  it('a row delete asks to confirm a single delete', () => {
    const { selection } = setup();
    tableProps.onDeleteResponse('b');
    expect(selection.setConfirmDelete).toHaveBeenCalledWith({ mode: 'single', target: { ids: ['b'] }, count: 1 });
  });

  it('a bulk delete request asks to confirm a bulk delete', () => {
    const { selection } = setup();
    barProps.onDeleteRequest({ ids: ['a', 'b'] }, 2);
    expect(selection.setConfirmDelete).toHaveBeenCalledWith({ mode: 'bulk', target: { ids: ['a', 'b'] }, count: 2 });
    barProps.onClear();
    expect(selection.clearSelection).toHaveBeenCalled();
  });

  it('shows the pagination footer and forwards page changes', async () => {
    const { props } = setup();
    expect(screen.getByText('Showing 21–40 of 45 responses')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(props.onPageChange).toHaveBeenCalledWith(3);
  });

  it('shows no footer when there are no results', () => {
    setup({ total: undefined });
    expect(screen.queryByText(/Showing/)).not.toBeInTheDocument();
  });
});
