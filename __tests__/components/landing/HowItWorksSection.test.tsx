/**
 * __tests__/HowItWorksSection.test.tsx
 * Feature: sprint-1-frontend-auth
 * Tests: HowItWorksSection — exactly 4 steps, section id present, step numbers 01-04
 * Requirements: 0.18, 0.19, 0.20
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HowItWorksSection from '@/components/landing/HowItWorksSection';

// Mock useIntersectionObserver to immediately report visible
vi.mock('@/hooks/useIntersectionObserver', () => ({
  useIntersectionObserver: () => ({
    ref: { current: null },
    isVisible: true,
  }),
}));

describe('HowItWorksSection component', () => {
  it('renders the section with id="how-it-works" for smooth-scroll anchor', () => {
    render(<HowItWorksSection />);
    const section = document.getElementById('how-it-works');
    expect(section).not.toBeNull();
  });

  it('renders exactly 4 steps with correct titles', () => {
    render(<HowItWorksSection />);
    const stepTitles = [
      /create your form/i,
      /share the link/i,
      /collect responses/i,
      /view your dashboard/i,
    ];
    stepTitles.forEach((pattern) => {
      expect(screen.getByText(pattern)).toBeInTheDocument();
    });
  });

  it('renders step numbers 01 through 04', () => {
    render(<HowItWorksSection />);
    ['01', '02', '03', '04'].forEach((num) => {
      expect(screen.getByText(num)).toBeInTheDocument();
    });
  });

  it('renders exactly 4 step card h3 elements', () => {
    render(<HowItWorksSection />);
    const h3s = document.querySelectorAll('h3');
    expect(h3s).toHaveLength(4);
  });
});
