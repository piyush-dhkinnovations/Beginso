/**
 * __tests__/app/dev/ui/page.test.tsx
 * Feature: sprint-7-foundation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Real next/navigation notFound() throws to halt rendering — mocked the same way so the
// component never reaches its JSX return in the production case (rendering JSX after
// stubbing NODE_ENV='production' trips Vitest's dev/production React runtime mismatch).
const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
vi.mock('next/navigation', () => ({ notFound }));
vi.mock('@/components/dev/UiGalleryShell', () => ({ UiGalleryShell: () => null }));

describe('/dev/ui gallery route — production gate', () => {
  beforeEach(() => {
    vi.resetModules();
    notFound.mockClear();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('calls notFound() in a production build', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { default: DevUiGalleryPage } = await import('@/app/dev/ui/page');
    expect(() => DevUiGalleryPage()).toThrow('NEXT_NOT_FOUND');
    expect(notFound).toHaveBeenCalledOnce();
  });

  // "Renders fine outside production" is covered elsewhere rather than here: stubbing
  // NODE_ENV back and forth within one Vitest module graph corrupts React's dev/production
  // jsx-runtime resolution for subsequent dynamic imports in the same file (a Vitest/Vite
  // quirk, not a product bug) — see __tests__/components/dev/UiGalleryContent.test.tsx for
  // the actual render coverage, plus this task's own `next build` + dev-server verification.
});
