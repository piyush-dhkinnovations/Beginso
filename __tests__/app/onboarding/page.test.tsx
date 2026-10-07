import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';

const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

const mockAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => mockAuth() }));

const mockComplete = vi.fn();
vi.mock('@/services/auth', () => ({ authService: { completeOnboarding: () => mockComplete() } }));

import OnboardingPage from '@/app/onboarding/page';

describe('OnboardingPage', () => {
  beforeEach(() => {
    mockReplace.mockClear();
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
});
