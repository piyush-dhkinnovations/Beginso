import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResponsesCountChips } from '@/components/responses/ResponsesCountChips';
import type { ResponseStats } from '@/types/response';
import type { StageRef } from '@/types/stage';

const stage = (id: string, name: string, category: StageRef['category']) => ({ id, name, category }) as unknown as StageRef;

const stages = [stage('s1', 'New', 'new'), stage('s2', 'Review', 'in_progress'), stage('s3', 'Interview', 'in_progress'), stage('s4', 'Done', 'completed')];
const stats: ResponseStats = {
  total: 77,
  unread: 71,
  byStage: [
    { stageId: 's1', name: 'New', category: 'new', count: 16 },
    { stageId: 's2', name: 'Review', category: 'in_progress', count: 5 },
  ],
  byCategory: { new: 16, in_progress: 21, completed: 40 },
};

const chip = (name: RegExp | string) => screen.getByRole('button', { name });

describe('ResponsesCountChips', () => {
  it('shows All, Unread and one chip per stage with counts', () => {
    render(<ResponsesCountChips stats={stats} stages={stages} filters={{}} onFilterChange={vi.fn()} />);
    expect(chip(/^All 77/)).toBeInTheDocument();
    expect(chip(/^Unread 71/)).toBeInTheDocument();
    expect(chip(/^New 16/)).toBeInTheDocument();
    expect(chip(/^Review 5/)).toBeInTheDocument();
  });

  it('uses the category total only when the stage is alone in its category', () => {
    render(<ResponsesCountChips stats={stats} stages={stages} filters={{}} onFilterChange={vi.fn()} />);
    expect(chip(/^Done 40/)).toBeInTheDocument();
    // Interview shares in_progress with Review and has no byStage entry: no number is guessed.
    expect(chip('Interview')).toBeInTheDocument();
  });

  it('shows no counts before stats arrive', () => {
    render(<ResponsesCountChips stages={stages} filters={{}} onFilterChange={vi.fn()} />);
    expect(chip('All')).toBeInTheDocument();
    expect(chip('New')).toBeInTheDocument();
  });

  it('marks the active chip from the filters (stage wins over unread)', () => {
    const { rerender } = render(<ResponsesCountChips stats={stats} stages={stages} filters={{}} onFilterChange={vi.fn()} />);
    expect(chip(/^All/)).toHaveAttribute('aria-pressed', 'true');
    rerender(<ResponsesCountChips stats={stats} stages={stages} filters={{ unread: true }} onFilterChange={vi.fn()} />);
    expect(chip(/^Unread/)).toHaveAttribute('aria-pressed', 'true');
    rerender(<ResponsesCountChips stats={stats} stages={stages} filters={{ unread: true, stageId: 's2' }} onFilterChange={vi.fn()} />);
    expect(chip(/^Review/)).toHaveAttribute('aria-pressed', 'true');
    expect(chip(/^Unread/)).toHaveAttribute('aria-pressed', 'false');
  });

  it('emits mutually exclusive filter patches', async () => {
    const onFilterChange = vi.fn();
    render(<ResponsesCountChips stats={stats} stages={stages} filters={{}} onFilterChange={onFilterChange} />);
    await userEvent.click(chip(/^Unread/));
    expect(onFilterChange).toHaveBeenLastCalledWith({ stageId: undefined, unread: true });
    await userEvent.click(chip(/^Review/));
    expect(onFilterChange).toHaveBeenLastCalledWith({ stageId: 's2', unread: undefined });
    await userEvent.click(chip(/^All/));
    expect(onFilterChange).toHaveBeenLastCalledWith({ stageId: undefined, unread: undefined });
  });
});
