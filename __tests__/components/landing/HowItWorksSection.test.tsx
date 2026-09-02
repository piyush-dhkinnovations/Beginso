/**
 * __tests__/HowItWorksSection.test.tsx
 * Feature: sprint-1-frontend-auth
 * Tests: HowItWorksSection — exactly 3 steps (build/share/track), section id present
 * Requirements: 0.18, 0.19, 0.20
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HowItWorksSection from '@/components/landing/HowItWorksSection';

// Mock useReveal to immediately report visible
vi.mock('@/hooks/useReveal', () => ({
  useReveal: () => ({
    ref: { current: null },
    visible: true,
  }),
}));

describe('HowItWorksSection component', () => {
  it('renders the section with id="how-it-works" for smooth-scroll anchor', () => {
    render(<HowItWorksSection />);
    const section = document.getElementById('how-it-works');
    expect(section).not.toBeNull();
  });

  it('renders exactly 3 steps with correct titles', () => {
    render(<HowItWorksSection />);
    const stepTitles = [
      /drag the fields you need/i,
      /one link, anywhere/i,
      /watch it fill up/i,
    ];
    stepTitles.forEach((pattern) => {
      expect(screen.getByText(pattern)).toBeInTheDocument();
    });
  });

  it('renders the Build, Share and Track eyebrows', () => {
    render(<HowItWorksSection />);
    ['Build', 'Share', 'Track'].forEach((label) => {
      expect(screen.getByText(label)).toBeInTheDocument();
    });
  });

  it('renders exactly 3 step card h3 elements', () => {
    render(<HowItWorksSection />);
    const h3s = document.querySelectorAll('h3');
    expect(h3s).toHaveLength(3);
  });
});
