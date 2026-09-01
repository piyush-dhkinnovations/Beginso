/**
 * __tests__/components/ui/Skeleton.test.tsx
 * Feature: sprint-7-foundation
 */

import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton } from '@/components/ui/Skeleton';

describe('Skeleton component', () => {
  it('is hidden from assistive tech and applies the text variant by default', () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild as HTMLElement;
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el.className).toMatch(/bg-skeleton-text/);
  });

  it('applies the requested variant and custom dimensions', () => {
    const { container } = render(<Skeleton variant="circle" width={40} height={40} />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toMatch(/bg-skeleton-circle/);
    expect(el.style.width).toBe('40px');
    expect(el.style.height).toBe('40px');
  });
});
