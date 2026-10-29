import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BannerExtras, hasBannerExtras } from '@/components/public-form/BannerExtras';
import { FormBanner } from '@/components/public-form/FormBanner';

describe('BannerExtras: the header\'s line of text and link', () => {
  it('shows the text and a link that opens in a new tab', () => {
    render(<BannerExtras branding={{ bannerText: 'Takes two minutes', bannerLinks: [{ label: 'Privacy', url: 'https://example.com/p' }, { label: 'Portfolio', url: 'https://example.org' }] }} />);
    expect(screen.getByText('Takes two minutes')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: 'Privacy' });
    expect(link).toHaveAttribute('href', 'https://example.com/p');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
    expect(screen.getByRole('link', { name: 'Portfolio' })).toHaveAttribute('href', 'https://example.org/');
  });

  it('names the link by its address when it has no words', () => {
    render(<BannerExtras branding={{ bannerLinks: [{ url: 'https://example.com/p' }] }} />);
    expect(screen.getByRole('link', { name: 'example.com' })).toBeInTheDocument();
  });

  it('never draws a link that is not http or https', () => {
    render(<BannerExtras branding={{ bannerLinks: [{ label: 'x', url: 'javascript:alert(1)' }] }} />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(hasBannerExtras({ bannerLinks: [{ url: 'javascript:alert(1)' }] })).toBe(false);
  });

  it('is on the form\'s header, even for a form with no title, logo or cover', () => {
    render(<FormBanner branding={{ bannerText: 'Hello there' }} />);
    expect(screen.getByText('Hello there')).toBeInTheDocument();
  });
});
