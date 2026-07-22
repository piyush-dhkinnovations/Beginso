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

  it('renders nothing when totalPages is 1', () => {
    const { container } = render(<FormProgress currentPage={1} totalPages={1} />);
    expect(container).toBeEmptyDOMElement();
  });
});
