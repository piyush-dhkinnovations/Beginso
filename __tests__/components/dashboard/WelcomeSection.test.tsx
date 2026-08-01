/**
 * __tests__/components/dashboard/WelcomeSection.test.tsx
 * Audit remediation: zero test coverage. Tests: greets by name when the user
 * has loaded, falls back to a generic greeting otherwise.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WelcomeSection } from '@/components/dashboard/WelcomeSection';

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('WelcomeSection component', () => {
  it('greets the user by name once loaded', () => {
    mockUseAuth.mockReturnValue({ user: { name: 'Jane Doe' } });
    render(<WelcomeSection />);
    expect(screen.getByText('Welcome back, Jane Doe!')).toBeInTheDocument();
  });

  it('falls back to a generic greeting when there is no user yet', () => {
    mockUseAuth.mockReturnValue({ user: undefined });
    render(<WelcomeSection />);
    expect(screen.getByText('Welcome back!')).toBeInTheDocument();
  });
});
