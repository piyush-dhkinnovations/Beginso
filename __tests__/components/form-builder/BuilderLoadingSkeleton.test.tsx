import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BuilderLoadingSkeleton } from '@/components/form-builder/BuilderLoadingSkeleton';

describe('BuilderLoadingSkeleton', () => {
  it('is announced as a busy "Loading form" region and has no interactive content', () => {
    render(<BuilderLoadingSkeleton />);
    const el = screen.getByLabelText('Loading form');
    expect(el).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
