import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import Footer from '@/components/landing/Footer';
import CtaSection from '@/components/landing/CtaSection';

vi.mock('@/hooks/useReveal', () => ({ useReveal: () => ({ ref: { current: null }, visible: true }) }));
vi.mock('@/components/landing/CookieSettingsButton', () => ({ CookieSettingsButton: () => null }));

// Colour tokens that turn the other way round in a dark theme: on these bands they made a white block with a white logo on it.
const FLIPS = /surface-inverse|text-on-brand|surface-card\)|text-primary\)/;

describe('landing page bands in a dark theme', () => {
  it('the footer stays navy with white text, so its white logo can be seen', () => {
    const { container } = render(<Footer />);
    const footer = container.querySelector('footer')!;
    expect(footer).toHaveClass('bg-(--ink-900)');
    expect(footer.outerHTML).not.toMatch(FLIPS);
  });

  it('the closing call to action is the same navy card in every theme', () => {
    const { container } = render(<CtaSection />);
    const card = container.querySelector('section > div')!;
    expect(card).toHaveClass('bg-(--ink-900)');
    expect(card.outerHTML).not.toMatch(FLIPS);
  });
});
