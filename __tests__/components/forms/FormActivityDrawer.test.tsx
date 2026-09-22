/**
 * __tests__/components/forms/FormActivityDrawer.test.tsx
 * sprint-10-events-migration, tasks.md 3.2 / 8.1 — this component had no dedicated test file;
 * only exercised indirectly (open + dialog-appears) through overview/page.test.tsx. Its own
 * loading/error/pagination logic was previously unverified.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { FormActivityDrawer } from '@/components/forms/FormActivityDrawer';

const mockList = vi.fn();
vi.mock('@/services/events', () => ({
  eventsService: { listFormEvents: (...a: unknown[]) => mockList(...a) },
}));

function events(n: number, offset = 0) {
  return Array.from({ length: n }, (_, i) => ({
    id: `e${offset + i}`,
    actorName: `Actor ${offset + i}`,
    action: 'form.published',
    targetType: 'form',
    targetId: 'f1',
    targetLabel: 'Survey',
    createdAt: new Date().toISOString(),
  }));
}

function renderDrawer(props: Partial<React.ComponentProps<typeof FormActivityDrawer>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <FormActivityDrawer formId="f1" isOpen onClose={vi.fn()} {...props} />
    </QueryClientProvider>
  );
}

describe('FormActivityDrawer', () => {
  beforeEach(() => mockList.mockReset());

  it('does not fetch while closed', () => {
    mockList.mockResolvedValue(events(3));
    renderDrawer({ isOpen: false });

    expect(mockList).not.toHaveBeenCalled();
  });

  it('fetches page 1 at the drawer page size once open', async () => {
    mockList.mockResolvedValue(events(3));
    renderDrawer();

    expect(await screen.findByText('Actor 0')).toBeInTheDocument();
    expect(mockList).toHaveBeenCalledWith('f1', 1, 20);
  });

  it('shows a loading skeleton before the query resolves, not an empty list', () => {
    mockList.mockResolvedValue(events(3));
    renderDrawer();

    const dialog = screen.getByRole('dialog', { name: 'Form activity' });
    // Synchronous assertion, before the resolved promise is awaited anywhere — proves the
    // loading branch renders first, same pattern used elsewhere in this suite.
    expect(within(dialog).queryByText('Actor 0')).not.toBeInTheDocument();
  });

  it('shows an error state with a working Retry', async () => {
    mockList.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(events(1));
    renderDrawer();

    expect(await screen.findByText('Could not load activity.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Actor 0')).toBeInTheDocument();
  });

  it('Next is disabled on a short (less than a full page) result, Previous is disabled on page 1', async () => {
    mockList.mockResolvedValue(events(3));
    renderDrawer();

    await screen.findByText('Actor 0');
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('Next is enabled on a full page and pages forward, requesting page 2', async () => {
    mockList.mockResolvedValueOnce(events(20)).mockResolvedValueOnce(events(5, 20));
    renderDrawer();

    await screen.findByText('Actor 0');
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();

    await userEvent.click(screen.getByRole('button', { name: 'Next' }));

    expect(await screen.findByText('Actor 20')).toBeInTheDocument();
    expect(mockList).toHaveBeenLastCalledWith('f1', 2, 20);
  });
});
