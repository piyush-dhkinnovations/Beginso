import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ScoreCard } from '@/components/scoring/ScoreCard';
import type { ScoreCriterion } from '@/types/score';

vi.mock('@/services/scores', () => ({ scoresService: { getScore: vi.fn().mockResolvedValue(null), putScore: vi.fn() } }));
vi.mock('@/components/ui/Toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));

const criterion = (o: Partial<ScoreCriterion>): ScoreCriterion => ({ id: 'c1', workspaceId: 'w', label: '', order: 0, isDefault: false, ...o });

function renderCard(criteria: ScoreCriterion[]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ScoreCard responseId="r1" criteria={criteria} />
    </QueryClientProvider>
  );
}

describe('ScoreCard criterion label', () => {
  it('calls an unnamed default criterion "Overall score", not "Unnamed criterion"', async () => {
    renderCard([criterion({ isDefault: true })]);
    expect(await screen.findByText('Overall score')).toBeInTheDocument();
    expect(screen.queryByText('Unnamed criterion')).not.toBeInTheDocument();
  });

  it('keeps the placeholder for an unnamed non-default criterion', async () => {
    renderCard([criterion({})]);
    expect(await screen.findByText('Unnamed criterion')).toBeInTheDocument();
  });
});
