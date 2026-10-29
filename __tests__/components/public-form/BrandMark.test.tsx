/**
 * Feature: form icon on the public form
 * Tests: BrandMark / hasBrandMark, and that the banner shows an icon when there is no logo.
 */
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { BrandMark, hasBrandMark, logoPx } from '@/components/public-form/BrandMark';
import { FormBanner } from '@/components/public-form/FormBanner';

describe('hasBrandMark', () => {
  it('is true for a logo or a known icon, false otherwise', () => {
    expect(hasBrandMark({ logoUrl: '/a.png' })).toBe(true);
    expect(hasBrandMark({ iconName: 'rating-star' })).toBe(true);
    expect(hasBrandMark({ iconName: 'not-an-icon' })).toBe(false);
    expect(hasBrandMark({ iconName: 'rocket' })).toBe(false); // an older name from before the icon set changed
    expect(hasBrandMark({})).toBe(false);
  });
});

describe('logoPx', () => {
  it('small, medium (the default) and large are three clearly different sizes', () => {
    expect([logoPx({ logoSize: 'sm' }), logoPx({}), logoPx({ logoSize: 'md' }), logoPx({ logoSize: 'lg' })]).toEqual([32, 48, 48, 72]);
  });

  it('the corners are a share of the size of the logo: a small logo gets half the rounding of a medium one', () => {
    const radius = (logoSize: 'sm' | 'md' | 'lg') => parseFloat(render(<BrandMark branding={{ logoUrl: '/a.png', logoSize }} size={logoPx({ logoSize })} />).container.querySelector('img')!.style.borderRadius);
    const [sm, md, lg] = [radius('sm'), radius('md'), radius('lg')];
    expect(sm).toBeLessThan(md);
    expect(md).toBeLessThan(lg);
    expect(sm * 2).toBe(md);
  });

  it('the banner draws the logo at the chosen size', () => {
    const { container } = render(<FormBanner branding={{ logoUrl: '/a.png', logoSize: 'lg' }} title='T' />);
    expect(container.querySelector('img')).toHaveStyle({ width: '72px', height: '72px' });
  });
});

describe('BrandMark', () => {
  it('shows the logo when there is one (it wins over an icon)', () => {
    const { container } = render(<BrandMark branding={{ logoUrl: '/a.png', iconName: 'rating-star' }} size={44} />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/a.png');
    expect(container.querySelector('svg')).toBeNull();
  });

  it('shows the icon artwork on its tile when there is no logo', () => {
    const { container } = render(<BrandMark branding={{ iconName: 'rating-star' }} size={44} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.firstElementChild).toHaveStyle({ width: '44px', height: '44px' });
  });
});

describe('FormBanner with an icon', () => {
  it('draws the icon over the banner, like a logo', () => {
    const { container } = render(<FormBanner branding={{ iconName: 'startup-launch' }} title="Launch survey" />);
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.textContent).toContain('Launch survey');
  });

  it('also draws it under an original-size cover image', () => {
    const { container } = render(<FormBanner branding={{ iconName: 'startup-launch', coverImageUrl: '/c.png', coverFit: 'original' }} title="T" />);
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
