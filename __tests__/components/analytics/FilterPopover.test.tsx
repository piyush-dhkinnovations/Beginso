import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FilterPopover } from '@/components/analytics/FilterPopover';

describe('FilterPopover', () => {
  it('shows the summary on the button and keeps the panel closed', () => {
    render(<FilterPopover summary="Last 7 days"><p>panel body</p></FilterPopover>);
    const btn = screen.getByRole('button', { name: /Filters/ });
    expect(btn).toHaveTextContent('Last 7 days');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('toggles the panel from the button', async () => {
    const user = userEvent.setup();
    render(<FilterPopover summary="All time"><p>panel body</p></FilterPopover>);
    const btn = screen.getByRole('button', { name: /Filters/ });
    await user.click(btn);
    expect(screen.getByRole('dialog', { name: 'Analytics filters' })).toHaveTextContent('panel body');
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    await user.click(btn);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on an outside click but not on a click inside', async () => {
    const user = userEvent.setup();
    render(<div><button>outside</button><FilterPopover summary="x"><p>inside</p></FilterPopover></div>);
    await user.click(screen.getByRole('button', { name: /Filters/ }));
    await user.click(screen.getByText('inside'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'outside' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes on Escape and returns focus to the button', async () => {
    const user = userEvent.setup();
    render(<FilterPopover summary="x"><input aria-label="field" /></FilterPopover>);
    const btn = screen.getByRole('button', { name: /Filters/ });
    await user.click(btn);
    await user.click(screen.getByLabelText('field'));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(btn).toHaveFocus();
  });
});
