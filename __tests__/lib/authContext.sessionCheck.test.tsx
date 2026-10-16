/**
 * A15-004: any failure of the session check (500, 429, network) used to end the session: the person was sent to /login and
 * the real server session was destroyed. Now only a 401/403 says the session is over; anything else keeps it, retries
 * quietly, and then offers "Try again".
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

const replace = vi.fn();
vi.mock('@/lib/firebase', () => ({ auth: {} }));
vi.mock('firebase/auth', () => ({ signOut: vi.fn().mockResolvedValue(undefined) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace, push: vi.fn() }), usePathname: () => '/dashboard' }));
const bindRecentFormsUser = vi.fn();
vi.mock('@/store/recentFormsStore', () => ({ bindRecentFormsUser: (...a: unknown[]) => bindRecentFormsUser(...a) }));

const probeSession = vi.fn();
const logout = vi.fn().mockResolvedValue(undefined);
vi.mock('@/services/auth', () => ({
  authService: {
    prepareFirebase: vi.fn().mockResolvedValue(undefined),
    probeSession: (...a: unknown[]) => probeSession(...a),
    getMe: vi.fn(),
    logout: (...a: unknown[]) => logout(...a),
  },
}));

import { AuthProvider } from '@/lib/authContext';
import { useAuth } from '@/hooks/useAuth';

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { response: { status } });
const user = { user: { id: 'u1', name: 'Asha', email: 'a@b.c', onboardingCompleted: true } };

function Who() {
  const { user: u, isLoading } = useAuth();
  return <p>{isLoading ? 'loading' : u ? `hello ${u.name}` : 'nobody'}</p>;
}
const mount = () =>
  render(
    <AuthProvider>
      <Who />
    </AuthProvider>
  );

beforeEach(() => {
  probeSession.mockReset();
  logout.mockClear();
  replace.mockClear();
  bindRecentFormsUser.mockClear();
  window.history.pushState({}, '', '/dashboard');
});

describe('session check failures', () => {
  it('a 500 that clears on the next try keeps the person signed in, with no logout and no redirect', async () => {
    probeSession.mockRejectedValueOnce(httpError(500)).mockResolvedValue(user);
    mount();
    expect(await screen.findByText('hello Asha', {}, { timeout: 4000 })).toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });

  it('a 429 and a dropped connection are treated the same way', async () => {
    probeSession.mockRejectedValueOnce(httpError(429)).mockRejectedValueOnce(new Error('Network Error')).mockResolvedValue(user);
    mount();
    expect(await screen.findByText('hello Asha', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
  });

  it('when it keeps failing: shows "Try again", never logs out, and does not wipe the recent forms', async () => {
    probeSession.mockRejectedValue(httpError(500));
    mount();
    expect(await screen.findByText("We couldn't check your sign-in", {}, { timeout: 6000 })).toBeInTheDocument();
    expect(logout).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(bindRecentFormsUser).not.toHaveBeenCalledWith(null);

    probeSession.mockReset().mockResolvedValue(user);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('hello Asha')).toBeInTheDocument();
  });

  it('a 401 still ends the session: logout and a redirect to /login', async () => {
    probeSession.mockRejectedValue(httpError(401));
    mount();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
    expect(logout).toHaveBeenCalled();
  });

  it('a 403 still goes to the suspended screen', async () => {
    probeSession.mockRejectedValue(httpError(403));
    mount();
    await waitFor(() => expect(replace).toHaveBeenCalledWith('/login?reason=suspended'));
  });
});
