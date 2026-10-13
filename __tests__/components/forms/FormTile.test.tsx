import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FormTile } from '@/components/forms/FormTile';

describe('FormTile', () => {
  it('renders a decorative neutral tile with an icon when there is no logo', () => {
    const { container } = render(<FormTile title="Customer Survey" size={40} />);
    const tile = container.firstElementChild as HTMLElement;
    expect(tile).toHaveAttribute('aria-hidden', 'true');
    expect(tile).toHaveStyle({ width: '40px', height: '40px' });
    expect(tile.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('img')).toBeNull();
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
