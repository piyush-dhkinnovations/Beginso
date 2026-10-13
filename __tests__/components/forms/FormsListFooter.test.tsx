import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormsListFooter } from '@/components/forms/FormsListFooter';
import { makeState } from './formsTestUtils';

describe('FormsListFooter', () => {
  it('renders nothing when there are no forms', () => {
    const { container } = render(<FormsListFooter s={makeState()} total={0} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('summarises the visible range and offers the three page sizes', () => {
    render(<FormsListFooter s={makeState({ page: 2, pageSize: 10 })} total={23} />);
    expect(screen.getByText(/Showing 11–20 of 23 forms/)).toBeInTheDocument();
    const select = screen.getByLabelText('Rows per page') as HTMLSelectElement;
    expect(select.value).toBe('10');
    expect(Array.from(select.options).map((o) => o.value)).toEqual(['10', '25', '50']);
  });

  it('changing the page size sets it, resets to page 1 and clears the selection', async () => {
    const s = makeState();
    render(<FormsListFooter s={s} total={40} />);
    await userEvent.selectOptions(screen.getByLabelText('Rows per page'), '25');
    expect(s.setPageSize).toHaveBeenCalledWith(25);
    expect(s.setPage).toHaveBeenCalledWith(1);
    expect(s.setSelectedIds).toHaveBeenCalledWith(new Set());
  });

  it('changing the page clears the selection', async () => {
    const s = makeState();
    render(<FormsListFooter s={s} total={40} />);
    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(s.setPage).toHaveBeenCalledWith(2);
    expect(s.setSelectedIds).toHaveBeenCalledWith(new Set());
  });

  it('uses the singular noun for one form', () => {
    render(<FormsListFooter s={makeState()} total={1} />);
    expect(screen.getByText(/Showing 1–1 of 1 form$/)).toBeInTheDocument();
  });
});
