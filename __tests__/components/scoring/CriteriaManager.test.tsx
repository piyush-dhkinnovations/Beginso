import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/services/scores', () => ({
  scoresService: {
    listCriteria: () =>
      Promise.resolve([
        { _id: 'c1', label: '', order: 0, isDefault: true },
        { _id: 'c2', label: '', order: 1, isDefault: false },
        { _id: 'c3', label: 'Budget', order: 2, isDefault: false },
      ]),
  },
}));

import { CriteriaManager } from '@/components/scoring/CriteriaManager';

describe('CriteriaManager', () => {
  it('names the seeded default criterion "Overall score" instead of "Unnamed criterion"', async () => {
    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <CriteriaManager scope="ws1" />
      </QueryClientProvider>
    );
    expect(await screen.findByText('Overall score')).toBeInTheDocument();
    // A non-default criterion that really has no label keeps the honest fallback.
    expect(screen.getAllByText('Unnamed criterion')).toHaveLength(1);
    expect(screen.getByText('Budget')).toBeInTheDocument();
  });
});
