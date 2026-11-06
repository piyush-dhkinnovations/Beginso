/**
 * The first-run Personal Home: a welcome with two ways to start, and the three steps as a path where only the first can be started now.
 */
import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { FirstRunHome } from '@/components/dashboard/FirstRunHome';

describe('FirstRunHome', () => {
  it('welcomes with a heading and the two ways to start', () => {
    render(<FirstRunHome />);
    expect(screen.getByRole('heading', { name: 'Create your first form' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Create Form/ })).toHaveAttribute('href', '/forms/new');
    expect(screen.getByRole('link', { name: /Browse templates/ })).toHaveAttribute('href', '/templates');
  });

  it('shows the three steps in order, and only Build is a link', () => {
    render(<FirstRunHome />);
    const steps = within(screen.getByRole('list', { name: 'How it works' })).getAllByRole('listitem');
    expect(steps).toHaveLength(3);
    expect(steps.map((s) => s.textContent)).toEqual([
      expect.stringContaining('Build'),
      expect.stringContaining('Share'),
      expect.stringContaining('Collect'),
    ]);
    expect(steps[0].textContent).toContain('Step 1');
    expect(within(steps[0]).getByRole('link', { name: /Build/ })).toHaveAttribute('href', '/forms/new');
    expect(within(steps[1]).queryByRole('link')).not.toBeInTheDocument();
    expect(within(steps[2]).queryByRole('link')).not.toBeInTheDocument();
    expect(steps[1].textContent).toContain('After you publish');
  });

  it('keeps the picture decorative', () => {
    const { container } = render(<FirstRunHome />);
    for (const art of container.querySelectorAll('.bg-illustration')) expect(art).toHaveAttribute('aria-hidden', 'true');
  });
});
