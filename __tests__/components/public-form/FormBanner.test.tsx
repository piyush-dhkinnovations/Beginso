/**
 * Feature: sprint-3-public-form
 * Tests for FormBanner — cover image vs. fallback color, optional logo overlap.
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FormBanner } from '@/components/public-form/FormBanner';

describe('FormBanner', () => {
  it('renders the cover image when coverImageUrl is set', () => {
    const { container } = render(<FormBanner branding={{ coverImageUrl: 'https://example.com/cover.jpg' }} />);
    expect(container.querySelector('img')).toHaveAttribute('src', 'https://example.com/cover.jpg');
  });

  it('renders a fallback background color when coverImageUrl is not set', () => {
    const { container } = render(<FormBanner branding={{ primaryColor: '#123456' }} />);
    expect(container.firstChild).toHaveStyle({ backgroundColor: '#123456' });
  });

  it('falls back to the default brand color when no primaryColor is set', () => {
    const { container } = render(<FormBanner branding={{}} />);
    expect(container.firstChild).toHaveStyle({ backgroundColor: '#1D4ED8' });
  });

  it('renders the logo when logoUrl is set', () => {
    const { container } = render(<FormBanner branding={{ logoUrl: 'https://example.com/logo.png' }} />);
    expect(container.querySelector('img[src="https://example.com/logo.png"]')).toBeInTheDocument();
  });

  it('does not render a logo when logoUrl is not set', () => {
    const { container } = render(<FormBanner branding={{}} />);
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });
});
