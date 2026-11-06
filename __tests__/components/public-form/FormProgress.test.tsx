/**
 * Feature: sprint-3-public-form
 * Tests for FormProgress — step/percentage label, aria attributes, single-page suppression.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FormProgress } from '@/components/public-form/FormProgress';

describe('FormProgress', () => {
  it('renders "Step 1 of 3" with the correct percentage and aria attributes', () => {
    render(<FormProgress currentPage={1} totalPages={3} />);
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
    expect(screen.getByText('33%')).toBeInTheDocument();
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '33');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('draws dots: the current one is wide, with the same words and the progressbar role', () => {
    const { container } = render(<FormProgress currentPage={2} totalPages={4} style="dots" />);
    expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
    expect(container.querySelectorAll('span.rounded-full')).toHaveLength(4);
    expect(container.querySelectorAll('.w-6')).toHaveLength(1);
  });

  it('draws numbered steps: finished ones show a tick, the current one is marked', () => {
    render(<FormProgress currentPage={2} totalPages={3} style="steps" />);
    const list = screen.getByRole('list', { name: 'Step 2 of 3' });
    const items = Array.from(list.querySelectorAll('li'));
    expect(items).toHaveLength(3);
    expect(items[0].querySelector('svg')).not.toBeNull(); // done
    expect(items[1]).toHaveAttribute('aria-current', 'step');
    expect(items[1]).toHaveTextContent('2');
    expect(items[2]).toHaveTextContent('3');
  });

  it('renders nothing when totalPages is 1, in every style', () => {
    for (const style of ['bar', 'dots', 'steps'] as const) {
      const { container } = render(<FormProgress currentPage={1} totalPages={1} style={style} />);
      expect(container).toBeEmptyDOMElement();
    }
  });

  it('renders nothing when totalPages is 1', () => {
    const { container } = render(<FormProgress currentPage={1} totalPages={1} />);
    expect(container).toBeEmptyDOMElement();
  });
});
