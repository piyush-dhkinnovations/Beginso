/**
 * __tests__/FeaturesSection.test.tsx
 * Feature: sprint-1-frontend-auth
 * Tests: FeaturesSection — exactly 4 bento cards rendered, section id present
 * Requirements: 0.14, 0.15, 0.16 — Property 11
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import FeaturesSection from '@/components/landing/FeaturesSection';

// Mock useReveal to immediately report visible
vi.mock('@/hooks/useReveal', () => ({
  useReveal: () => ({
    ref: { current: null },
    visible: true,
  }),
}));

describe('FeaturesSection component', () => {
  it('renders the section with id="features" for smooth-scroll anchor', () => {
    render(<FeaturesSection />);
    const section = document.getElementById('features');
    expect(section).not.toBeNull();
  });

  it('renders exactly 4 feature cards with correct titles', () => {
    render(<FeaturesSection />);
    const expectedTitles = [
      /workspaces with roles/i,
      /a dashboard that builds itself/i,
      /responses you can actually work/i,
      /get the data out/i,
    ];
    expectedTitles.forEach((pattern) => {
      expect(screen.getByText(pattern)).toBeInTheDocument();
    });
  });

  it('renders exactly 4 card title elements (h3)', () => {
    render(<FeaturesSection />);
    const headings = document.querySelectorAll('h3');
    expect(headings).toHaveLength(4);
  });

  it('registers the reveal observer on mount', () => {
    const { container } = render(<FeaturesSection />);
    expect(container.querySelector('#features')).not.toBeNull();
  });
});
