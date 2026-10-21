import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { SegmentedRadio } from '@/components/ui/SegmentedRadio';

const OPTIONS = [
  { id: 'grid', label: 'Grid', title: 'Two columns' },
  { id: 'list', label: 'List', title: 'One column' },
  { id: 'table', label: 'Table', title: 'Rows like a table' },
];

function Harness({ onChange = vi.fn() }: { onChange?: (id: string) => void }) {
  const [value, setValue] = useState('grid');
  return (
    <>
      <button>before</button>
      <SegmentedRadio
        ariaLabel="Layout"
        options={OPTIONS}
        value={value}
        onChange={(id) => {
          setValue(id);
          onChange(id);
        }}
      />
      <button>after</button>
    </>
  );
}

describe('SegmentedRadio', () => {
  it('is a radio group with one checked radio, named by its label', () => {
    render(<Harness />);
    expect(screen.getByRole('radiogroup', { name: 'Layout' })).toBeInTheDocument();
    const radios = screen.getAllByRole('radio');
    expect(radios.map((r) => r.textContent)).toEqual(['Grid', 'List', 'Table']);
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toEqual(['true', 'false', 'false']);
  });

  it('is a single stop in the Tab order (roving tabindex)', async () => {
    render(<Harness />);
    expect(screen.getAllByRole('radio').map((r) => r.tabIndex)).toEqual([0, -1, -1]);
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole('radio', { name: 'Grid' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'after' })).toHaveFocus();
  });

  it('arrow keys move focus and select, wrapping at both ends', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    screen.getByRole('radio', { name: 'Grid' }).focus();
    await userEvent.keyboard('{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'List' })).toHaveFocus();
    expect(screen.getByRole('radio', { name: 'List' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.keyboard('{ArrowDown}{ArrowRight}');
    expect(screen.getByRole('radio', { name: 'Grid' })).toHaveFocus();
    await userEvent.keyboard('{ArrowLeft}');
    expect(screen.getByRole('radio', { name: 'Table' })).toHaveFocus();
    expect(onChange).toHaveBeenLastCalledWith('table');
    await userEvent.keyboard('{Home}');
    expect(screen.getByRole('radio', { name: 'Grid' })).toHaveAttribute('aria-checked', 'true');
    await userEvent.keyboard('{End}');
    expect(screen.getByRole('radio', { name: 'Table' })).toHaveAttribute('aria-checked', 'true');
  });

  it('a click selects, and tooltips come from title', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await userEvent.click(screen.getByRole('radio', { name: 'Table' }));
    expect(onChange).toHaveBeenCalledWith('table');
    expect(screen.getByRole('radio', { name: 'Table' })).toHaveAttribute('title', 'Rows like a table');
  });

  it('keeps the label for assistive tech when icons only are shown on small screens', () => {
    render(<SegmentedRadio ariaLabel="Layout" options={OPTIONS} value="grid" onChange={() => {}} iconOnlyBelow="lg" />);
    expect(screen.getByRole('radio', { name: 'Grid' })).toBeInTheDocument();
    expect(screen.getByText('Grid')).toHaveClass('max-lg:sr-only');
  });
});
