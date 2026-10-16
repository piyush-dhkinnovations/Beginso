import { describe, it, expect } from 'vitest';
import { completionRateUnavailableReason } from '@/lib/completionRate';
import { render, screen } from '@testing-library/react';
import { CompletionRateCard } from '@/components/analytics/CompletionRateCard';

describe('completionRateUnavailableReason', () => {
  it('names the real cause of the dash', () => {
    expect(completionRateUnavailableReason(13, 2)).toMatch(/more responses than recorded views/i);
    expect(completionRateUnavailableReason(5, 0)).toMatch(/No views were recorded/);
    expect(completionRateUnavailableReason(5, null)).toMatch(/No views were recorded/);
    expect(completionRateUnavailableReason(0, 0)).toBe('Not enough views yet');
    expect(completionRateUnavailableReason(undefined, undefined)).toBe('Not enough views yet');
  });
});

describe('CompletionRateCard', () => {
  it('never shows 100% when there is no rate: a dash with the reason', () => {
    render(<CompletionRateCard rate={null} unavailableReason={completionRateUnavailableReason(13, 2)} />);
    expect(screen.queryByText('100%')).not.toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText(/more responses than recorded views/i)).toBeInTheDocument();
  });

  it('shows a real 0% (0 responses, some views) as 0%, not a dash', () => {
    render(<CompletionRateCard rate={0} />);
    expect(screen.getAllByText('0%').length).toBeGreaterThan(0);
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });

  it('says the figure is all-time', () => {
    render(<CompletionRateCard rate={42} />);
    expect(screen.getByText('42% of people who open this form finish it (all time)')).toBeInTheDocument();
  });
});
