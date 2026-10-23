import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActiveFilterChips } from '@/components/responses/ActiveFilterChips';

const stages = [{ id: 's1', name: 'New', colour: 'info', category: 'new' }] as const;
const noop = vi.fn();

describe('ActiveFilterChips', () => {
  it('shows a removable chip for each active filter, and Clear all', () => {
    render(<ActiveFilterChips filters={{ stageId: 's1', duplicate: true }} stages={stages} onRemove={noop} onClearAll={noop} />);
    expect(screen.getByRole('button', { name: 'Remove filter: Stage: New' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove filter: Duplicates only' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Clear all' })).toBeInTheDocument();
  });

  it('leaves out the filters it is told another control already shows', () => {
    render(<ActiveFilterChips filters={{ stageId: 's1', unread: true, q: 'x', duplicate: true }} stages={stages} omit={['stageId', 'unread', 'q']} onRemove={noop} onClearAll={noop} />);
    expect(screen.queryByText(/Stage: New|Unread only|Search:/)).not.toBeInTheDocument();
    expect(screen.getByText('Duplicates only')).toBeInTheDocument();
  });

  it('renders nothing when every active filter is omitted', () => {
    const { container } = render(<ActiveFilterChips filters={{ stageId: 's1' }} stages={stages} omit={['stageId']} onRemove={noop} onClearAll={noop} />);
    expect(container).toBeEmptyDOMElement();
  });
});
