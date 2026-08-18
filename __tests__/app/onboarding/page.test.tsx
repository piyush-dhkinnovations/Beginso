/**
 * __tests__/app/onboarding/page.test.tsx
 * Tests: OnboardingPage — pre-fills the auto-generated workspace name, shows the signed-in
 * user's name/email, submits name + completes onboarding + hard-navigates to /dashboard on
 * success, never blocks navigation if completeOnboarding fails (best-effort signal, see
 * authService.completeOnboarding's comment), loading/error states.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetWorkspace = vi.fn();
const mockUpdateWorkspace = vi.fn();
vi.mock('@/services/settings', () => ({
  settingsService: {
    getWorkspace: (...args: unknown[]) => mockGetWorkspace(...args),
    updateWorkspace: (...args: unknown[]) => mockUpdateWorkspace(...args),
  },
}));

const mockCompleteOnboarding = vi.fn();
vi.mock('@/services/auth', () => ({
  authService: { completeOnboarding: (...args: unknown[]) => mockCompleteOnboarding(...args) },
}));

const mockUseAuth = vi.fn();
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

import OnboardingPage from '@/app/onboarding/page';

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <OnboardingPage />
    </QueryClientProvider>
  );
}

describe('OnboardingPage', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    mockGetWorkspace.mockReset();
    mockUpdateWorkspace.mockReset();
    mockCompleteOnboarding.mockReset();
    mockUseAuth.mockReturnValue({ user: { id: 'u1', name: 'Jordan Rivera', email: 'jordan@example.com' } });
    // window.location.href is read-only in jsdom by default; stub it so the component's
    // navigation assignment doesn't throw, and so the test can assert on it.
    Object.defineProperty(window, 'location', {
      writable: true,
      value: { ...originalLocation, href: '' },
    });
  });

  it('shows the signed-in user name/email and pre-fills the auto-generated workspace name', async () => {
    mockGetWorkspace.mockResolvedValue({ id: 'w1', name: "Jordan's Workspace", logoUrl: null, branding: {}, createdAt: '' });
    renderPage();

    expect(await screen.findByDisplayValue("Jordan's Workspace")).toBeInTheDocument();
    expect(screen.getByText('Jordan Rivera')).toBeInTheDocument();
    expect(screen.getByText('jordan@example.com')).toBeInTheDocument();
  });

  it('shows an inline error with retry when the workspace fails to load', async () => {
    mockGetWorkspace.mockRejectedValue(new Error('fail'));
    renderPage();
    expect(await screen.findByText('Unable to load your workspace.')).toBeInTheDocument();
  });

  it('saves the workspace name, completes onboarding, and hard-navigates to /dashboard', async () => {
    const user = userEvent.setup();
    mockGetWorkspace.mockResolvedValue({ id: 'w1', name: "Jordan's Workspace", logoUrl: null, branding: {}, createdAt: '' });
    mockUpdateWorkspace.mockResolvedValue({ id: 'w1', name: 'Acme Inc', logoUrl: null, branding: {}, createdAt: '' });
    mockCompleteOnboarding.mockResolvedValue(undefined);
    renderPage();

    const nameInput = await screen.findByDisplayValue("Jordan's Workspace");
    await user.clear(nameInput);
    await user.type(nameInput, 'Acme Inc');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(mockUpdateWorkspace).toHaveBeenCalledWith({ name: 'Acme Inc' }));
    await waitFor(() => expect(mockCompleteOnboarding).toHaveBeenCalled());
    await waitFor(() => expect(window.location.href).toBe('/dashboard'));
  });

  it('still navigates to /dashboard even when completeOnboarding fails (best-effort, never blocks)', async () => {
    const user = userEvent.setup();
    mockGetWorkspace.mockResolvedValue({ id: 'w1', name: "Jordan's Workspace", logoUrl: null, branding: {}, createdAt: '' });
    mockUpdateWorkspace.mockResolvedValue({ id: 'w1', name: "Jordan's Workspace", logoUrl: null, branding: {}, createdAt: '' });
    mockCompleteOnboarding.mockRejectedValue(new Error('network error'));
    renderPage();

    await screen.findByDisplayValue("Jordan's Workspace");
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(mockUpdateWorkspace).toHaveBeenCalled());
    await waitFor(() => expect(window.location.href).toBe('/dashboard'));
  });

  it('rejects a workspace name under 2 characters with a validation error', async () => {
    const user = userEvent.setup();
    mockGetWorkspace.mockResolvedValue({ id: 'w1', name: "Jordan's Workspace", logoUrl: null, branding: {}, createdAt: '' });
    renderPage();

    const nameInput = await screen.findByDisplayValue("Jordan's Workspace");
    await user.clear(nameInput);
    await user.type(nameInput, 'A');
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Workspace name must be at least 2 characters.')).toBeInTheDocument();
    expect(mockUpdateWorkspace).not.toHaveBeenCalled();
  });
});
