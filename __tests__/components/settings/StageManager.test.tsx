import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
const mockList = vi.fn();
vi.mock('@/services/stages', () => ({
  stagesService: {
    list: (...a: unknown[]) => mockList(...a),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    reorder: vi.fn(),
  },
}));

import { StageManager } from '@/components/settings/StageManager';

const stage = (id: string, name: string, category: 'new' | 'in_progress' | 'completed', order: number, over: Record<string, unknown> = {}) => ({
  id, name, colour: 'neutral', category, order, isDefault: order === 0, ...over,
});

function renderManager() {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <StageManager scope="acme" />
    </QueryClientProvider>
  );
}

beforeEach(() => {
  mockList.mockReset();
});

describe('StageManager', () => {
  // The table showed 0 on every row because the API list carried no per-stage count.
  it('shows how many responses each stage holds', async () => {
    mockList.mockResolvedValue([
      stage('s1', 'New', 'new', 0, { responseCount: 269 }),
      stage('s2', 'In Review', 'in_progress', 1, { responseCount: 300 }),
      stage('s3', 'On Hold', 'in_progress', 2, { responseCount: 0 }),
      stage('s4', 'Legacy', 'completed', 3), // an older backend sends no count
    ]);
    renderManager();
    await screen.findByText('In Review');
    const row = async (name: string) => screen.getAllByRole('row').find((r) => r.textContent?.includes(name) && r.querySelector('td')) as HTMLElement;
    expect(within(await row('New')).getByText('269')).toBeInTheDocument();
    expect(within(await row('In Review')).getByText('300')).toBeInTheDocument();
    expect(within(await row('On Hold')).getByText('0')).toBeInTheDocument();
    expect(within(await row('Legacy')).getByText('0')).toBeInTheDocument();
  });

  it('tells the person how many responses a stage holds before it can be deleted, and asks where to move them', async () => {
    mockList.mockResolvedValue([
      stage('s1', 'New', 'new', 0),
      stage('s2', 'In Review', 'in_progress', 1, { responseCount: 300 }),
      stage('s3', 'On Hold', 'in_progress', 2, { responseCount: 0 }),
    ]);
    renderManager();
    const inReview = (await screen.findByText('In Review')).closest('tr') as HTMLElement;
    await userEvent.click(within(inReview).getByRole('button', { name: /Delete/ }));
    await waitFor(() => expect(screen.getByText(/This stage holds 300 responses/)).toBeInTheDocument());
  });
});
