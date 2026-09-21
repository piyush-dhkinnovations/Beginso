/**
 * sprint-10-events-migration, tasks.md 3.1 / 7.2 — requirements.md §7.3, §7.4, design.md §18.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormOverviewStats } from '@/components/forms/FormOverviewStats';

const STATS = { responseCount: 12, responseCountThisWeek: 3, completionRate: 62.4 };

describe('FormOverviewStats', () => {
  it('shows the response total, this-week delta and rounded completion rate', () => {
    render(<FormOverviewStats stats={STATS} accessLabel="Just you" onOpenAccess={vi.fn()} />);

    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('+3 this week')).toBeInTheDocument();
    expect(screen.getByText('62%')).toBeInTheDocument();
  });

  it('renders "—" with an accessible explanation, never 0%, when completion rate is not tracked', () => {
    render(
      <FormOverviewStats stats={{ ...STATS, completionRate: null }} accessLabel="Just you" onOpenAccess={vi.fn()} />
    );

    expect(screen.getByLabelText('Completion rate not tracked yet')).toHaveTextContent('—');
    expect(screen.queryByText('0%')).not.toBeInTheDocument();
  });

  it('omits the this-week delta when the backend does not provide it, instead of showing +0', () => {
    render(
      <FormOverviewStats stats={{ ...STATS, responseCountThisWeek: null }} accessLabel="Just you" onOpenAccess={vi.fn()} />
    );

    expect(screen.queryByText(/this week/)).not.toBeInTheDocument();
  });

  it('exposes "who can see it" as a real, named button that calls onOpenAccess', async () => {
    const onOpenAccess = vi.fn();
    render(<FormOverviewStats stats={STATS} accessLabel="3 people" onOpenAccess={onOpenAccess} />);

    const button = screen.getByRole('button', { name: /View who has access/ });
    expect(button.tagName).toBe('BUTTON');
    expect(button).toHaveAccessibleName('View who has access: 3 people');

    await userEvent.click(button);
    expect(onOpenAccess).toHaveBeenCalledTimes(1);
  });
});
