import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import OnboardingLayout from '@/app/onboarding/layout';
import { WORDMARK_DARK, WORDMARK_LIGHT } from '@/lib/brand';

describe('OnboardingLayout', () => {
  // The page background follows the theme, so a logo forced to the light version was dark ink on dark in dark mode.
  it('lets the logo follow the theme, like the other signed-out screens', () => {
    render(<OnboardingLayout>content</OnboardingLayout>);
    expect(screen.getAllByRole('img', { name: 'Beginso' }).map((i) => i.getAttribute('src'))).toEqual([WORDMARK_LIGHT, WORDMARK_DARK]);
  });
});
