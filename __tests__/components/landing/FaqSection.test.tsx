import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import FaqSection from '@/components/landing/FaqSection';

describe('FaqSection', () => {
  it('has a FAQ anchor, eyebrow and heading', () => {
    const { container } = render(<FaqSection />);
    expect(container.querySelector('section#faq')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Questions, answered' })).toBeInTheDocument();
  });

  it('lists six questions, each collapsed into its own details element', () => {
    const { container } = render(<FaqSection />);
    const details = container.querySelectorAll('details');
    expect(details).toHaveLength(7);
    details.forEach((d) => expect(d.open).toBe(false));
  });

  it('states the 25 MB per-file upload limit and never the old 100 MB', () => {
    const { container } = render(<FaqSection />);
    expect(screen.getByText('How big can uploaded files be?')).toBeInTheDocument();
    expect(container).toHaveTextContent(/25 MB per file/);
    expect(container).not.toHaveTextContent(/100\s?MB/);
  });

  it('answers the privacy question without storing raw IPs', () => {
    render(<FaqSection />);
    expect(screen.getByText(/Raw IPs are never saved/)).toBeInTheDocument();
  });
});
