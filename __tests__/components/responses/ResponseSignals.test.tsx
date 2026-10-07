import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResponseSignals } from '@/components/responses/ResponseSignals';
import type { ResponseSignalsData } from '@/components/responses/ResponseSignals';

const BASE: ResponseSignalsData = {
  unread: false,
  assignee: null,
  tags: [],
  noteCount: 0,
  attachmentCount: 0,
  duplicateOfId: null,
};

describe('ResponseSignals', () => {
  it('announces unread textually, not colour-only', () => {
    render(<ResponseSignals response={{ ...BASE, unread: true }} density="row" />);
    expect(screen.getByText('Unread')).toBeInTheDocument();
  });

  it('renders "Unassigned" accessibly when there is no assignee', () => {
    render(<ResponseSignals response={BASE} density="row" />);
    expect(screen.getByLabelText('Unassigned')).toBeInTheDocument();
  });

  it('shows the assignee name when assigned', () => {
    render(
      <ResponseSignals
        response={{ ...BASE, assignee: { id: 'm1', name: 'Priya', avatarUrl: null } }}
        density="row"
      />
    );
    expect(screen.getByText('Priya')).toBeInTheDocument();
  });

  it('collapses more than 2 tags to "+N"', () => {
    render(
      <ResponseSignals
        response={{
          ...BASE,
          tags: [
            { id: 't1', name: 'Alpha', colour: '#000' },
            { id: 't2', name: 'Beta', colour: '#000' },
            { id: 't3', name: 'Gamma', colour: '#000' },
          ],
        }}
        density="row"
      />
    );
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
    expect(screen.queryByText('Gamma')).not.toBeInTheDocument();
  });

  it('shows a Duplicate badge only when duplicateOfId is set', () => {
    const { rerender } = render(<ResponseSignals response={BASE} density="row" />);
    expect(screen.queryByText('Duplicate')).not.toBeInTheDocument();
    rerender(<ResponseSignals response={{ ...BASE, duplicateOfId: 'r-original' }} density="row" />);
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
  });

  it('shows note and attachment counts when present', () => {
    render(<ResponseSignals response={{ ...BASE, noteCount: 3, attachmentCount: 2 }} density="row" />);
    expect(screen.getByLabelText('3 notes')).toBeInTheDocument();
    expect(screen.getByLabelText('2 attachments')).toBeInTheDocument();
  });
});
