/**
 * __tests__/app/dev/ui/frame/page.test.tsx
 * Feature: sprint-7-foundation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// See __tests__/app/dev/ui/page.test.tsx — notFound() must throw here too, matching real
// Next.js behavior, so execution never reaches this component's JSX return.
const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/components/dev/UiGalleryContent', () => ({ UiGalleryContent: () => null }));

describe('/dev/ui/frame gallery preview route — production gate', () => {
  beforeEach(() => {
    vi.resetModules();
    notFound.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('calls notFound() in a production build, same as the parent /dev/ui route', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { default: DevUiGalleryFramePage } = await import('@/app/dev/ui/frame/page');
    expect(() => DevUiGalleryFramePage()).toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledOnce();
  });
});
