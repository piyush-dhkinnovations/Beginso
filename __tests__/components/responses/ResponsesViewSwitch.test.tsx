import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponsesViewSwitch } from '@/components/responses/ResponsesViewSwitch';

describe('ResponsesViewSwitch', () => {
  it('is one switch of Table, Board and Calendar with the current one marked, like the Insights / Responses switch', () => {
    render(<ResponsesViewSwitch total={3} view="board" onViewChange={vi.fn()} />);
    const group = screen.getByRole('group', { name: 'Responses view' });
    expect(group).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Board' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Table' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Calendar' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('says how many responses there are, in singular and plural', () => {
    const { rerender } = render(<ResponsesViewSwitch total={1} view="table" onViewChange={vi.fn()} />);
    expect(screen.getByText('1 response')).toBeInTheDocument();
    rerender(<ResponsesViewSwitch total={1170} view="table" onViewChange={vi.fn()} />);
    expect(screen.getByText('1170 responses')).toBeInTheDocument();
  });

  it('leaves the all-months total out of the Calendar (it counts its own month)', () => {
    render(<ResponsesViewSwitch total={5} view="calendar" onViewChange={vi.fn()} />);
    expect(screen.queryByText('5 responses')).not.toBeInTheDocument();
  });

  it('reports the view chosen', async () => {
    const onViewChange = vi.fn();
    render(<ResponsesViewSwitch total={2} view="table" onViewChange={onViewChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Calendar' }));
    expect(onViewChange).toHaveBeenCalledWith('calendar');
  });
});
