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

  it('is drawn from the shared shimmering piece, hidden from a screen reader', () => {
    const { container } = render(<BuilderLoadingSkeleton />);
    const pieces = container.querySelectorAll('.bg-skeleton');
    expect(pieces.length).toBeGreaterThan(20);
    pieces.forEach((piece) => expect(piece).toHaveAttribute('aria-hidden', 'true'));
  });
});
