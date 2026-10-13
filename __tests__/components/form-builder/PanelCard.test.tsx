import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PanelCard } from '@/components/form-builder/PanelCard';

describe('PanelCard', () => {
  it('shows the label, the description and its children', () => {
    render(
      <PanelCard label="Appearance" description="Pick colours">
        <button>inner</button>
      </PanelCard>
    );
    expect(screen.getByText('Appearance')).toBeInTheDocument();
    expect(screen.getByText('Pick colours')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'inner' })).toBeInTheDocument();
  });
});
