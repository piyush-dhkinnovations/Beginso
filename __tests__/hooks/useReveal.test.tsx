import { describe, expect, it, vi, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { useReveal } from '@/hooks/useReveal';

function Probe() {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return <div ref={ref} data-visible={String(visible)} />;
}

const setMotion = (reduce: boolean) =>
  vi.stubGlobal('matchMedia', (q: string) => ({ matches: reduce && q.includes('reduce'), addEventListener() {}, removeEventListener() {} }));

afterEach(() => vi.unstubAllGlobals());

describe('useReveal', () => {
  it('shows the final state immediately when reduced motion is set (no observer, no animation)', () => {
    setMotion(true);
    const io = vi.fn();
    vi.stubGlobal('IntersectionObserver', io);
    const { container } = render(<Probe />);
    expect(container.firstElementChild?.getAttribute('data-visible')).toBe('true');
    expect(io).not.toHaveBeenCalled();
  });

  it('waits for the element to scroll into view otherwise', () => {
    setMotion(false);
    vi.stubGlobal('IntersectionObserver', class { observe() {} disconnect() {} });
    const { container } = render(<Probe />);
    expect(container.firstElementChild?.getAttribute('data-visible')).toBe('false');
  });
});
