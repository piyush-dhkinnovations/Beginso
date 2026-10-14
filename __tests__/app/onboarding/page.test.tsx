import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const mockReplace = vi.fn();
const mockNext = vi.hoisted(() => ({ value: null as string | null }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => ({ get: (k: string) => (k === 'next' ? mockNext.value : null) }),
}));

const mockAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockAuth() }));

const mockComplete = vi.fn();
vi.mock('@/services/auth', () => ({ authService: { completeOnboarding: () => mockComplete() } }));

import OnboardingPage from '@/app/onboarding/page';

describe('OnboardingPage', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockNext.value = null;
    mockComplete.mockReset().mockResolvedValue(undefined);
  });

  it('sends an already-onboarded user to /dashboard without calling the backend', async () => {
    mockAuth.mockReturnValue({ isLoading: false, user: { onboardingCompleted: true } });
    render(<OnboardingPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/dashboard'));
    expect(mockComplete).not.toHaveBeenCalled();
  });

  it('completes onboarding for an incomplete user then goes to /dashboard', async () => {
    mockAuth.mockReturnValue({ isLoading: false, user: { onboardingCompleted: false } });
    render(<OnboardingPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/dashboard'));
    expect(mockComplete).toHaveBeenCalledTimes(1);
  });

  it('hands the person back to where they were heading (e.g. a template being applied) once onboarding is done', async () => {
    mockNext.value = '/templates/apply/tpl-1';
    mockAuth.mockReturnValue({ isLoading: false, user: { onboardingCompleted: false } });
    render(<OnboardingPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/templates/apply/tpl-1'));
  });

  it('ignores an external next= and still goes to /dashboard', async () => {
    mockNext.value = 'https://evil.example';
    mockAuth.mockReturnValue({ isLoading: false, user: { onboardingCompleted: false } });
    render(<OnboardingPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/dashboard'));
  });
});
