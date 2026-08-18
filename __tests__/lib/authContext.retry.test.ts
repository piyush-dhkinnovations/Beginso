/**
 * __tests__/lib/authContext.retry.test.ts
 * Tests: getMeSettlingOnboarding — the bounded poll that closes the real race found via live
 * testing 18 Aug 2026, where a brand-new signup's GET /api/auth/me can come back missing
 * onboardingCompleted entirely (mid-write) for longer than one 800ms retry, sending the user to
 * /dashboard instead of /onboarding. Confirmed via server logs: two calls ~800ms apart both still
 * missing the field, so this polls up to 5 times, 1s apart, before giving up.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/firebase', () => ({ auth: {} }));
vi.mock('@/services/auth', () => ({
  authService: { getMe: vi.fn() },
}));

import { authService } from '@/services/auth';
import { getMeSettlingOnboarding } from '@/lib/authContext';

const mockGetMe = authService.getMe as ReturnType<typeof vi.fn>;

describe('getMeSettlingOnboarding', () => {
  beforeEach(() => {
    mockGetMe.mockReset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the first response immediately when onboardingCompleted is already present', async () => {
    mockGetMe.mockResolvedValueOnce({ user: { onboardingCompleted: false } });

    const result = await getMeSettlingOnboarding();

    expect(result).toEqual({ user: { onboardingCompleted: false } });
    expect(mockGetMe).toHaveBeenCalledTimes(1);
  });

  it('polls until onboardingCompleted appears, stopping as soon as it does', async () => {
    mockGetMe
      .mockResolvedValueOnce({ user: { id: 'u1' } })
      .mockResolvedValueOnce({ user: { id: 'u1' } })
      .mockResolvedValueOnce({ user: { id: 'u1', onboardingCompleted: false } });

    const resultPromise = getMeSettlingOnboarding();
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toEqual({ user: { id: 'u1', onboardingCompleted: false } });
    expect(mockGetMe).toHaveBeenCalledTimes(3);
  });

  it('gives up after 5 attempts for a genuinely legacy account (bounded, not infinite)', async () => {
    mockGetMe.mockResolvedValue({ user: { id: 'legacy-user' } });

    const resultPromise = getMeSettlingOnboarding();
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result).toEqual({ user: { id: 'legacy-user' } });
    expect(mockGetMe).toHaveBeenCalledTimes(5);
  });
});
