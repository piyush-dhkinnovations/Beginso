/**
 * Feature: text size
 * Tests: useTextScale — drawings measured in pixels (the SVG charts, logos, form tiles) follow the Text size setting on <html>.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTextScale } from '@/hooks/useTextScale';

describe('useTextScale', () => {
  beforeEach(() => document.documentElement.removeAttribute('data-text'));

  it('is 1 at the default size', () => {
    expect(renderHook(() => useTextScale()).result.current).toBe(1);
  });

  it.each([['large', 1.125], ['xlarge', 1.25]])('is %s = %s', (size, scale) => {
    document.documentElement.setAttribute('data-text', size);
    expect(renderHook(() => useTextScale()).result.current).toBe(scale);
  });

  it('follows a change made while the page is open', async () => {
    const { result } = renderHook(() => useTextScale());
    expect(result.current).toBe(1);
    await act(async () => {
      document.documentElement.setAttribute('data-text', 'xlarge');
      await Promise.resolve();
    });
    expect(result.current).toBe(1.25);
    await act(async () => {
      document.documentElement.removeAttribute('data-text');
      await Promise.resolve();
    });
    expect(result.current).toBe(1);
  });
});
