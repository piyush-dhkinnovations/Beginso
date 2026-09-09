import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

const mockReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

import OnboardingPage from '@/app/onboarding/page';

describe('OnboardingPage', () => {
  it('redirects directly to /dashboard', () => {
    render(<OnboardingPage />);
    expect(mockReplace).toHaveBeenCalledWith('/dashboard');
  });
});
