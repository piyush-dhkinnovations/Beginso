import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StageBadge } from '@/components/responses/StageBadge';
import type { StageRef } from '@/types/stage';

const STAGE: StageRef = { id: 's1', name: 'Screening', colour: 'info', category: 'new' };

describe('StageBadge', () => {
  it('renders the stage name', () => {
    render(<StageBadge stage={STAGE} />);
    expect(screen.getByText('Screening')).toBeInTheDocument();
  });

  it('renders a neutral "Unknown stage" chip when stage is missing, never throws', () => {
    render(<StageBadge stage={null} />);
    expect(screen.getByText('Unknown stage')).toBeInTheDocument();
  });

  it('renders a neutral "Unknown stage" chip for a stage with an empty id', () => {
    render(<StageBadge stage={{ id: '', name: '', colour: 'neutral', category: 'new' }} />);
    expect(screen.getByText('Unknown stage')).toBeInTheDocument();
  });
});
