/**
 * __tests__/components/landing/ProductMockup.test.tsx
 * Tests: ProductMockup — renders the dashboard scene (nav, stats, inbox, chart)
 * without crashing, and applies the scroll-driven tilt transform.
 *
 * Note: the reduced (<768px) composition and the full desktop composition are
 * both present in the JSDOM tree simultaneously (Tailwind's `hidden`/`md:*`
 * classes aren't evaluated as real media queries here), so any content that
 * appears in both — e.g. the first respondent's name — is asserted with
 * getAllByText rather than getByText.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProductMockup from '@/components/landing/ProductMockup';

vi.mock('@/hooks/useScrollProgress', () => ({
  useScrollProgress: () => ({
    ref: { current: null },
    progress: 0,
  }),
}));

describe('ProductMockup component', () => {
  it('renders without crashing', () => {
    expect(() => render(<ProductMockup />)).not.toThrow();
  });

  it('renders the stat strip', () => {
    render(<ProductMockup />);
    expect(screen.getByText('8,412')).toBeInTheDocument();
    expect(screen.getByText('64.2%')).toBeInTheDocument();
    expect(screen.getByText('17')).toBeInTheDocument();
    expect(screen.getByText('2m 14s')).toBeInTheDocument();
  });

  it('renders the left rail nav items', () => {
    render(<ProductMockup />);
    ['Home', 'Forms', 'Inbox', 'Insights', 'Team', 'Trash', 'Settings'].forEach((label) => {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });
  });

  it('renders the inbox rows with status badges', () => {
    render(<ProductMockup />);
    expect(screen.getAllByText('Amelia Ross').length).toBeGreaterThan(0);
    expect(screen.getAllByText('New').length).toBeGreaterThan(0);
    expect(screen.getAllByText('In progress').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Completed').length).toBeGreaterThan(0);
  });

  it('applies the tilt-stage/tilt-card wrapper classes', () => {
    const { container } = render(<ProductMockup />);
    expect(container.querySelector('.tilt-stage')).not.toBeNull();
    expect(container.querySelector('.tilt-card')).not.toBeNull();
  });
});
