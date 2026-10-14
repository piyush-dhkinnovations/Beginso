/**
 * Feature: the form owner sees that a respondent edited their answers.
 * Tests: ResponseSignals shows "Edited" for any respondent edit (info style), and keeps the warning style for an edit after review.
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResponseSignals } from '@/components/responses/ResponseSignals';

const base = { unread: false, assignee: null, tags: [], noteCount: 0, attachmentCount: 0 };

describe('ResponseSignals — edited by the respondent', () => {
  it('shows nothing when the respondent never edited', () => {
    render(<ResponseSignals response={base} density="row" />);
    expect(screen.queryByText('Edited')).not.toBeInTheDocument();
  });

  it('shows an info "Edited" chip for any edit, reviewed or not', () => {
    render(<ResponseSignals response={{ ...base, lastEditedByRespondentAt: '2026-10-14T10:00:00Z' }} density="row" />);
    const chip = screen.getByText('Edited');
    expect(chip).toHaveAttribute('title', 'The respondent changed their answers');
    expect(chip.className).toContain('info');
  });

  it('keeps the warning "Edited" chip for an edit after review, and does not show a second chip', () => {
    render(
      <ResponseSignals
        response={{ ...base, editedAfterReviewAt: '2026-10-14T11:00:00Z', lastEditedByRespondentAt: '2026-10-14T11:00:00Z' }}
        density="row"
      />
    );
    expect(screen.getAllByText('Edited')).toHaveLength(1);
    expect(screen.getByText('Edited').className).toContain('warning');
  });
});
