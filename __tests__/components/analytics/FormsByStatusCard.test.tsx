import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormsByStatusCard } from '@/components/analytics/FormsByStatusCard';

describe('FormsByStatusCard', () => {
  it('shows a placeholder while loading', () => {
    const { container } = render(<FormsByStatusCard counts={{ published: 1, draft: 0, closed: 0 }} isLoading />);
    expect(screen.getByRole('heading', { name: 'Forms by status' })).toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('shows the empty state when there are no forms', () => {
    render(<FormsByStatusCard counts={{ published: 0, draft: 0, closed: 0 }} isLoading={false} />);
    expect(screen.getByText('No forms yet')).toBeInTheDocument();
  });

  it('shows the total, a labelled bar and per-status counts with percentages', () => {
    render(<FormsByStatusCard counts={{ published: 6, draft: 3, closed: 1 }} isLoading={false} />);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Forms by status: 6 published, 3 draft, 1 closed' })).toBeInTheDocument();
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Published6 (60%)');
    expect(items[1]).toHaveTextContent('Draft3 (30%)');
    expect(items[2]).toHaveTextContent('Closed1 (10%)');
  });

  it('uses the singular for one form and lists zero-count statuses', () => {
    render(<FormsByStatusCard counts={{ published: 0, draft: 1, closed: 0 }} isLoading={false} />);
    expect(screen.getByText('form')).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', 'Forms by status: 0 published, 1 draft, 0 closed');
    expect(screen.getByText('Published').closest('li')).toHaveTextContent('Published0 (0%)');
  });
});
