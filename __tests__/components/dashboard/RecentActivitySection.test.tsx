import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RecentActivitySection } from '@/components/dashboard/RecentActivitySection';
import type { DashboardActivity } from '@/types/dashboard';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const activities: DashboardActivity[] = [
  {
    id: 'activity-1',
    type: 'response_submitted',
    occurredAt: '2026-08-07T12:15:30.000Z',
    form: { _id: 'form-1', title: 'Customer Feedback' },
    responseId: 'response-1',
  },
];

describe('RecentActivitySection component', () => {
  it('renders activity and links it to the response drawer URL', () => {
    render(<RecentActivitySection hasForms activities={activities} />);

    expect(screen.getByText('New response submitted')).toBeInTheDocument();
    expect(screen.getByText('Customer Feedback')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View response for Customer Feedback' })).toHaveAttribute(
      'href',
      '/inbox?responseId=response-1'
    );
    expect(document.querySelector('time')).toHaveAttribute('datetime', '2026-08-07T12:15:30.000Z');
  });

  it('shows a loading skeleton without an empty-state claim', () => {
    render(<RecentActivitySection isLoading />);

    expect(screen.getByLabelText('Loading recent activity')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('No forms created yet')).not.toBeInTheDocument();
  });

  it('shows a retryable error state', async () => {
    const onRetry = vi.fn();
    render(<RecentActivitySection isError onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load recent activity');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('shows the no-forms empty state with a create-form action by default', () => {
    render(<RecentActivitySection />);
    expect(screen.getByText('No forms created yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first form')).toBeInTheDocument();
  });

  it('shows an honest no-activity state once forms exist', () => {
    render(<RecentActivitySection hasForms />);
    expect(screen.getByText('No recent activity')).toBeInTheDocument();
    expect(screen.getByText('New form responses will appear here.')).toBeInTheDocument();
    expect(screen.queryByText('Create your first form')).not.toBeInTheDocument();
  });
});
