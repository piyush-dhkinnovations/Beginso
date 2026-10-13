import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ListFooter } from '@/components/ui/ListFooter';

describe('ListFooter', () => {
  it('renders nothing for an empty result', () => {
    const { container } = render(<ListFooter page={1} pageSize={20} total={0} onPageChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the first range and page buttons', () => {
    render(<ListFooter page={1} pageSize={20} total={77} onPageChange={vi.fn()} />);
    expect(screen.getByText('Showing 1–20 of 77 results')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
  });

  it('clamps the end of the last page', () => {
    render(<ListFooter page={4} pageSize={20} total={77} onPageChange={vi.fn()} />);
    expect(screen.getByText('Showing 61–77 of 77 results')).toBeInTheDocument();
  });

  it('uses a singular noun for one item and hides pagination', () => {
    render(<ListFooter page={1} pageSize={20} total={1} noun="form" onPageChange={vi.fn()} />);
    expect(screen.getByText('Showing 1–1 of 1 form')).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('pluralises a custom noun', () => {
    render(<ListFooter page={1} pageSize={5} total={12} noun="form" onPageChange={vi.fn()} />);
    expect(screen.getByText('Showing 1–5 of 12 forms')).toBeInTheDocument();
  });

  it('calls onPageChange and renders extra controls', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <ListFooter page={2} pageSize={10} total={35} onPageChange={onPageChange}>
        <span>rows per page</span>
      </ListFooter>,
    );
    expect(screen.getByText('rows per page')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    await user.click(screen.getByRole('button', { name: 'Previous page' }));
    expect(onPageChange).toHaveBeenCalledWith(1);
  });
});
