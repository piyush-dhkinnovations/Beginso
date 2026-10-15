import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

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
const mockUpdate = vi.fn();
vi.mock('@/services/settings', () => ({ settingsService: { updateProfile: (p: unknown) => mockUpdate(p) } }));

import OnboardingPage from '@/app/onboarding/page';

const fresh = { isLoading: false, user: { onboardingCompleted: false, name: 'Priya Sharma' } };

describe('OnboardingPage', () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockNext.value = null;
    mockComplete.mockReset().mockResolvedValue(undefined);
    mockUpdate.mockReset().mockResolvedValue({});
  });

  it('sends an already-onboarded user straight on without showing the form or calling the backend', async () => {
    mockAuth.mockReturnValue({ isLoading: false, user: { onboardingCompleted: true } });
    render(<OnboardingPage />);
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/dashboard'));
    expect(mockComplete).not.toHaveBeenCalled();
    expect(screen.queryByLabelText('Your name')).toBeNull();
  });

  it('starts from the signup name, offers the ten Beginso avatars, and saves the chosen name and avatar', async () => {
    mockAuth.mockReturnValue(fresh);
    render(<OnboardingPage />);
    const input = await screen.findByLabelText('Your name');
    expect(input).toHaveValue('Priya Sharma');
    expect(screen.getAllByRole('radio')).toHaveLength(10);

    await userEvent.clear(input);
    await userEvent.type(input, 'Pri');
    await userEvent.click(screen.getByRole('radio', { name: 'Avatar 4' }));
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/dashboard'));
    expect(mockUpdate).toHaveBeenCalledWith({ name: 'Pri', avatarUrl: `${window.location.origin}/avatars/04.svg` });
    expect(mockComplete).toHaveBeenCalledTimes(1);
  });

  it('will not continue with a name shorter than two characters', async () => {
    mockAuth.mockReturnValue(fresh);
    render(<OnboardingPage />);
    const input = await screen.findByLabelText('Your name');
    await userEvent.clear(input);
    await userEvent.type(input, 'P');
    expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
  });

  it('Skip completes onboarding without touching the profile', async () => {
    mockAuth.mockReturnValue(fresh);
    render(<OnboardingPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Skip for now' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/dashboard'));
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockComplete).toHaveBeenCalledTimes(1);
  });

  it('keeps the form and shows an error when saving fails, so nothing is lost', async () => {
    mockAuth.mockReturnValue(fresh);
    mockUpdate.mockRejectedValue(new Error('boom'));
    render(<OnboardingPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Continue' }));
    expect(await screen.findByText('Not saved')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('hands the person back to where they were heading once onboarding is done, and ignores an external next=', async () => {
    mockAuth.mockReturnValue(fresh);
    mockNext.value = '/templates/apply/tpl-1';
    const { unmount } = render(<OnboardingPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Skip for now' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/templates/apply/tpl-1'));
    unmount();

    mockReplace.mockClear();
    mockNext.value = 'https://evil.example';
    render(<OnboardingPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Skip for now' }));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/dashboard'));
  });
});
