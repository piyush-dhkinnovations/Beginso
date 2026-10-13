import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ExportMark } from '@/components/illustrations/ExportMark';

describe('ExportMark', () => {
  it('is a decorative svg with the default icon class', () => {
    const { container } = render(<ExportMark />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveClass('bg-icon');
  });

  it('accepts a custom className', () => {
    const { container } = render(<ExportMark className="size-10" />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('size-10');
    expect(svg).not.toHaveClass('bg-icon');
  });
});
