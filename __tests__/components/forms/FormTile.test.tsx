import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FormTile } from '@/components/forms/FormTile';

describe('FormTile', () => {
  it('with no logo or icon, shows the illustration that suits the title, alone: no tile, border or background', () => {
    const { container } = render(<FormTile title="Customer Survey" size={40} />);
    const box = container.firstElementChild as HTMLElement;
    expect(box).toHaveStyle({ width: '40px', height: '40px' });
    expect(box.className).not.toMatch(/border|bg-/);
    expect(box.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('different kinds of title get different artwork', () => {
    const a = render(<FormTile title="Product Order Form" />).container.innerHTML;
    const b = render(<FormTile title="Customer feedback" />).container.innerHTML;
    expect(a).not.toBe(b);
  });

  it('shows the chosen icon', () => {
    const chosen = render(<FormTile title="x" size={40} iconName="idea-strategy" />).container.innerHTML;
    const other = render(<FormTile title="x" size={40} iconName="shopping-cart-full" />).container.innerHTML;
    expect(chosen).not.toBe(other);
    expect(chosen).toContain('<svg');
  });

  it('falls back to the suggestion for an icon name this build does not know (for example an older one)', () => {
    const unknown = render(<FormTile title="Event Registration" size={40} iconName="not-a-real-icon" />).container.innerHTML;
    const auto = render(<FormTile title="Event Registration" size={40} />).container.innerHTML;
    expect(unknown).toBe(auto);
  });

  it('a logo wins over an icon', () => {
    const { container } = render(<FormTile title="x" size={40} logoUrl="/logo.png" iconName="rating-star" />);
    expect(container.querySelector('img')).toHaveAttribute('src', '/logo.png');
    expect(container.querySelector('svg')).toBeNull();
  });

  it('shows a small logo at full tile size, with no margin', () => {
    const { container } = render(<FormTile title="x" size={40} logoUrl="/logo.png" />);
    const img = container.querySelector('img')!;
    expect(img).toHaveAttribute('src', '/logo.png');
    expect(img).toHaveAttribute('aria-hidden', 'true');
    expect(img).toHaveStyle({ width: '40px', height: '40px', margin: '0px' });
  });

  it('insets a big (card-size) logo to 80% and centres it with margin', () => {
    const { container } = render(<FormTile title="x" size={100} logoUrl="/logo.png" />);
    expect(container.querySelector('img')).toHaveStyle({ width: '80px', height: '80px', margin: '10px' });
  });
});
