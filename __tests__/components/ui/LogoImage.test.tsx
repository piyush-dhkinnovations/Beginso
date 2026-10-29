import { describe, it, expect } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { LogoImage } from '@/components/ui/LogoImage';

describe('LogoImage', () => {
  it('holds its place with a quiet tile while the picture loads, then shows the picture', () => {
    const { container } = render(<LogoImage src="/logo.png" size={40} />);
    const box = container.firstElementChild as HTMLElement;
    const img = container.querySelector('img')!;
    expect(box).toHaveStyle({ width: '40px', height: '40px' });
    expect(box.className).toMatch(/animate-pulse/);
    expect(img.className).toMatch(/opacity-0/);
    fireEvent.load(img);
    expect(box.className).not.toMatch(/animate-pulse/);
    expect(img.className).toMatch(/opacity-100/);
  });

  it('rounds its corners in proportion to its size (a sixth of the width), so a small logo is not turned into a circle', () => {
    const small = render(<LogoImage src="/a.png" size={24} />);
    expect(small.container.querySelector('img')).toHaveStyle({ borderRadius: '4px' });
    const large = render(<LogoImage src="/b.png" size={48} />);
    expect(large.container.querySelector('img')).toHaveStyle({ borderRadius: '8px' });
    // the tile that holds its place while loading has the same corners as the picture that replaces it
    expect(small.container.firstElementChild).toHaveStyle({ borderRadius: '4px' });
  });

  it('a picture that cannot be loaded leaves the tile, not a broken-image mark', () => {
    const { container } = render(<LogoImage src="/missing.png" size={24} />);
    fireEvent.error(container.querySelector('img')!);
    expect(container.querySelector('img')).toBeNull();
    expect(container.firstElementChild).toHaveStyle({ width: '24px', height: '24px' });
  });
});
