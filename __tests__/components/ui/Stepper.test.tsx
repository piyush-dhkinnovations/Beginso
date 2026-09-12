/**
 * __tests__/components/ui/Stepper.test.tsx
 * Feature: sprint-7-foundation
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Stepper } from '@/components/ui/Stepper';

describe('Stepper component', () => {
  it('marks steps before currentStep as done and currentStep as current', () => {
    render(
      <Stepper
        steps={[{ label: 'Details' }, { label: 'Review' }, { label: 'Confirm' }]}
        currentStep={1}
      />
    );
    expect(screen.getByText('Details').closest('li')).toHaveClass('is-done');
    expect(screen.getByText('Review').closest('li')).toHaveClass('is-current');
    expect(screen.getByText('Review').closest('li')).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Confirm').closest('li')).not.toHaveClass('is-done', 'is-current');
  });
});
