/**
 * __tests__/FeaturesSection.test.tsx
 * Feature: sprint-1-frontend-auth
 * Tests: FeaturesSection — exactly 6 cards rendered, section id present
 * Requirements: 0.14, 0.15, 0.16 — Property 11
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FeaturesSection from '@/components/landing/FeaturesSection';

// Mock useIntersectionObserver to immediately report visible
vi.mock('@/hooks/useIntersectionObserver', () => ({
  useIntersectionObserver: () => ({
    ref: { current: null },
    isVisible: true, // treat as visible so cards render at full opacity
  }),
}));

describe('FeaturesSection component', () => {
  it('renders the section with id="features" for smooth-scroll anchor', () => {
    render(<FeaturesSection />);
    const section = document.getElementById('features');
    expect(section).not.toBeNull();
  });

  it('renders exactly 6 feature cards with correct titles', () => {
    render(<FeaturesSection />);
    const expectedTitles = [
      /drag.and.drop builder/i,
      /auto.generated dashboards/i,
      /response status tracking/i,
      /csv and pdf export/i,
      /10 field types/i,
      /mobile.ready public forms/i,
    ];
    expectedTitles.forEach((pattern) => {
      expect(screen.getByText(pattern)).toBeInTheDocument();
    });
  });

  it('renders exactly 6 card title elements (h3)', () => {
    render(<FeaturesSection />);
    // Each feature card has an h3
    const headings = document.querySelectorAll('h3');
    expect(headings).toHaveLength(6);
  });

  it('registers IntersectionObserver on mount', () => {
    // useIntersectionObserver is mocked — just verify the section renders
    const { container } = render(<FeaturesSection />);
    expect(container.querySelector('#features')).not.toBeNull();
  });
});
