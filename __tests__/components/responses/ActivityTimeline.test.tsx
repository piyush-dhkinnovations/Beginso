import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivityTimeline } from '@/components/responses/ActivityTimeline';
import type { ActivityEntry } from '@/types/activity';
import type { StageRef } from '@/types/stage';

const stages = [
  { id: 's1', name: 'New' },
  { id: 's2', name: 'In Review' },
] as unknown as StageRef[];

const entry = (o: Partial<ActivityEntry>): ActivityEntry => ({
  id: 'e1',
  type: 'stage_changed',
  actorName: 'Asha Rao',
  at: '2026-10-04T18:24:00.000Z',
  ...o,
});

describe('ActivityTimeline wording', () => {
  it('says who moved the stage from what to what when the stage ids are sent', () => {
    render(<ActivityTimeline entries={[entry({ fromStageId: 's1', toStageId: 's2' })]} stages={stages} />);
    expect(screen.getByText(/moved the stage from New to In Review/)).toBeInTheDocument();
    expect(screen.getByText('Asha Rao')).toBeInTheDocument();
  });

  it('falls back to "moved the stage" when the backend sends no stage ids (never invents them)', () => {
    render(<ActivityTimeline entries={[entry({})]} stages={stages} />);
    expect(screen.getByText(/moved the stage$/)).toBeInTheDocument();
    expect(screen.queryByText(/from .* to/)).not.toBeInTheDocument();
  });

  it('ignores stage ids that no longer exist', () => {
    render(<ActivityTimeline entries={[entry({ fromStageId: 'gone', toStageId: 'gone2' })]} stages={stages} />);
    expect(screen.getByText(/moved the stage$/)).toBeInTheDocument();
  });

  it('keeps the detail for tag changes and puts the exact time in a tooltip', () => {
    render(<ActivityTimeline entries={[entry({ type: 'tag_added', detail: '2 tags' })]} stages={stages} />);
    expect(screen.getByText(/added — 2 tags/)).toBeInTheDocument();
    expect(document.querySelector('p[title]')?.getAttribute('title')).toMatch(/2026/);
  });
});
