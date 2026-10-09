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
    expect(screen.getByText('this week')).toBeInTheDocument();
    // The value and the ring's own label both read 62% — the card is meant to show it twice.
    expect(screen.getAllByText('62%').length).toBeGreaterThanOrEqual(1);
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

  // Sprint 11 5.3: computed accessibility, not JSX presence — keyboard reachability asserted by
  // actually tabbing and pressing a key, not by reading the source for a tabIndex prop.
  it('the "who can see it" button is reachable by Tab and activates on Enter, not just click', async () => {
    const onOpenAccess = vi.fn();
    render(<FormOverviewStats stats={STATS} accessLabel="3 people" onOpenAccess={onOpenAccess} />);

    await userEvent.tab();
    const focusOrder: string[] = [];
    let guard = 0;
    while (document.activeElement && document.activeElement !== document.body && guard < 10) {
      focusOrder.push(document.activeElement.getAttribute('aria-label') ?? document.activeElement.tagName);
      await userEvent.tab();
      guard++;
    }
    expect(focusOrder).toContain('View who has access: 3 people');

    const button = screen.getByRole('button', { name: /View who has access/ });
    button.focus();
    await userEvent.keyboard('{Enter}');
    expect(onOpenAccess).toHaveBeenCalledTimes(1);
  });

  it('the untracked-completion-rate tooltip trigger is itself reachable by keyboard, with its own accessible name (not just visually labelled)', async () => {
    render(
      <FormOverviewStats stats={{ ...STATS, completionRate: null }} accessLabel="Just you" onOpenAccess={vi.fn()} />
    );
    const trigger = screen.getByLabelText('Completion rate not tracked yet');
    expect(trigger).toHaveAttribute('tabindex', '0');
    trigger.focus();
    expect(document.activeElement).toBe(trigger);
  });

  it('decorative icons are hidden from assistive tech (aria-hidden), not announced as unlabeled images', () => {
    render(<FormOverviewStats stats={STATS} accessLabel="3 people" onOpenAccess={vi.fn()} />);
    const icons = document.querySelectorAll('svg');
    expect(icons.length).toBeGreaterThan(0);
    icons.forEach((icon) => expect(icon).toHaveAttribute('aria-hidden', 'true'));
  });
});
