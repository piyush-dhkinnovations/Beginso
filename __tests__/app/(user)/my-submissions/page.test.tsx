/**
 * Feature: My Submissions (signed-in respondent)
 * Tests: the card list, its status filter and search, the empty and error states.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mine = vi.hoisted(() => vi.fn());
vi.mock('@/services/respondent', () => ({ respondentService: { mine: () => mine() } }));

import MySubmissionsPage from '@/app/(user)/my-submissions/page';

const row = (id: string, formName: string, status: string, over: Record<string, unknown> = {}) => ({
  id,
  formName,
  ownerName: 'Acme',
  submittedAt: '2026-10-14T18:57:00.000Z',
  status,
  canEdit: true,
  ...over,
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MySubmissionsPage />
    </QueryClientProvider>
  );
}

describe('MySubmissionsPage', () => {
  beforeEach(() => mine.mockReset());

  it('shows each submission as a design-system card whose title links to its detail, with sender and status', async () => {
    mine.mockResolvedValue([row('s1', 'Event Registration', 'Received'), row('s2', 'Job Application', 'Completed', { canEdit: false })]);
    renderPage();
    const link = await screen.findByRole('link', { name: 'Event Registration' });
    expect(link).toHaveAttribute('href', '/my-submissions/s1');
    const card = link.closest('.bg-card') as HTMLElement; // the design-system Card, same as the Forms page
    expect(card).toHaveTextContent('from Acme');
    expect(card).toHaveTextContent('Received');
    expect(screen.getByRole('link', { name: 'Job Application' }).closest('.bg-card')).toHaveTextContent('Completed');
  });

  it('filters by status chip (with counts) and by search', async () => {
    mine.mockResolvedValue([row('s1', 'Event Registration', 'Received'), row('s2', 'Job Application', 'Completed'), row('s3', 'Feedback', 'Received')]);
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('link', { name: /Event Registration/ });
    expect(screen.getByRole('button', { name: /^All\s*3$/ })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: /^Completed\s*1$/ }));
    expect(screen.queryByRole('link', { name: /Event Registration/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Job Application/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^All/ }));
    await user.type(screen.getByLabelText('Search your submissions'), 'feed');
    expect(screen.getByRole('link', { name: /Feedback/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Job Application/ })).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText('Search your submissions'));
    await user.type(screen.getByLabelText('Search your submissions'), 'zzz');
    expect(screen.getByText('No matching submissions')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Clear filters' }));
    expect(screen.getByRole('link', { name: /Event Registration/ })).toBeInTheDocument();
  });

  it('shows the empty state when there is nothing, and a retry when loading fails', async () => {
    mine.mockResolvedValueOnce([]);
    const { unmount } = renderPage();
    expect(await screen.findByText('You have not submitted anything yet')).toBeInTheDocument();
    unmount();
    mine.mockRejectedValueOnce(new Error('x'));
    renderPage();
    expect(await screen.findByText('We could not load your submissions.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows the own logo of the form on its card', async () => {
    mine.mockResolvedValue([row('s1', 'Kala Chasma Content', 'Received', { branding: { logoUrl: 'https://cdn.example.com/kala.png', iconName: null } })]);
    const { container } = renderPage();
    await screen.findByRole('link', { name: 'Kala Chasma Content' });
    expect(container.querySelector('img[src="https://cdn.example.com/kala.png"]')).not.toBeNull();
  });
});
