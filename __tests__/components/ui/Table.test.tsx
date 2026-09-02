/**
 * __tests__/components/ui/Table.test.tsx
 * Feature: sprint-7-foundation
 * Tests: Table — renders rows, loading-skeleton state, empty state
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Table, type TableColumn } from '@/components/ui/Table';

interface Row {
  id: string;
  name: string;
}

const columns: TableColumn<Row>[] = [{ key: 'name', header: 'Name', render: (r) => r.name }];

describe('Table component', () => {
  it('renders a row per item', () => {
    const rows: Row[] = [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }];
    render(<Table columns={columns} rows={rows} rowKey={(r) => r.id} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
  });

  it('renders skeleton rows when loading, not the empty state or data', () => {
    const rows: Row[] = [{ id: '1', name: 'Alice' }];
    const { container } = render(
      <Table columns={columns} rows={rows} rowKey={(r) => r.id} isLoading skeletonRows={3} />
    );
    expect(screen.queryByText('Alice')).not.toBeInTheDocument();
    expect(container.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(container.querySelectorAll('.bg-skeleton')).toHaveLength(3);
  });

  it('renders the emptyState slot when there are no rows and not loading', () => {
    render(<Table columns={columns} rows={[]} rowKey={(r) => r.id} emptyState={<span>Nothing here</span>} />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });
});
