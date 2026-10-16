'use client';

import React, { createContext, useReducer, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { authService } from '@/services/auth';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { PROTECTED_PATHS, matchesRoute } from './authRoutes';
import { bindRecentFormsUser } from '@/store/recentFormsStore';
import { applyTheme, isThemePreference, readDarkVariant, readThemePreference, storeTheme, type ThemePreference } from './theme';

interface User {
  id: string;
  name: string;
  email: string;
  workspaceId?: string;
  // Confirmed live 18 Aug 2026, but can be briefly absent right after account creation — see
  // getMeSettlingOnboarding() below. An explicit `=== false` check everywhere this is read treats
  // a missing/undefined field as "already onboarded," which is also the correct fallback for any
  // account that predates this field entirely. Deliberately on this thin AuthContext User (not
  // settings' UserProfile) since it gates app-wide routing, not a page-local concern — see the
  // reasoning design.md §2 already applied to avatarUrl.
  onboardingCompleted?: boolean;
  /** The account's saved colour theme; applied to this device after sign-in (see the effect in AuthProvider). */
  theme?: ThemePreference;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** The session check failed for a reason that says nothing about the session (server error, rate limit, network). */
  sessionError: boolean;
}

type AuthAction =
  | { type: 'LOGIN'; payload: { user: User } }
  | { type: 'LOGOUT' }
  | { type: 'SESSION_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean };

interface AuthContextValue extends AuthState {
  login: (redirectTo?: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Check the session again after a transient failure. */
  retrySession: () => void;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // starts loading while verifying token
  sessionError: false,
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
        sessionError: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        sessionError: false,
      };
    case 'SESSION_ERROR':
      return { ...state, user: null, isAuthenticated: false, isLoading: false, sessionError: true };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };
    default:
      return state;
  }
}

// A brand-new signup's user record can still be mid-write when login() checks it — live testing
// 18 Aug 2026 confirmed via server-side request logs that TWO GET /api/auth/me calls ~800ms apart
// (session POST, then the two getMe calls this function itself made) both came back missing
// onboardingCompleted, avatarUrl, emailVerified, createdAt, and lastLoginAt — a single retry
// wasn't enough. Polls a few times instead; an existing account pays nothing extra past the first
// call, since its response already has the field one way or the other.
// ponytail: bounded poll (5 attempts, 1s apart, ~4s worst case), not indefinite — if the backend's
// write regularly takes longer than that, that's a real backend fix needed, not a longer wait here.
export async function getMeSettlingOnboarding() {
  const maxAttempts = 5;
  let result = await authService.getMe();
  for (let attempt = 1; attempt < maxAttempts && result.user.onboardingCompleted === undefined; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    result = await authService.getMe();
  }
  return result;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const router = useRouter();

  // Sidebar "recent forms" live in localStorage, shared by every account on this browser: tie them to whoever is
  // signed in so one account never sees another's forms. Waits for the session check to finish — before that
  // `user` is null only because it is still unknown, and binding to null would wipe a valid list on every reload.
  const userId = state.user?.id ?? null;
  useEffect(() => {
    // A failed session check is not a sign-out: the person is still who they were, so their list must survive it.
    if (!state.isLoading && !state.sessionError) bindRecentFormsUser(userId);
  }, [userId, state.isLoading, state.sessionError]);

  // The account's saved theme is the source of truth: when it differs from what this device has, adopt it (a new device
  // or browser then looks the way the person chose). Settings → Appearance writes both sides, so they normally agree
  // and this does nothing. The dark style stays per-device.
  const savedTheme = state.user?.theme;
  useEffect(() => {
    if (!isThemePreference(savedTheme) || readThemePreference() === savedTheme) return;
    const variant = readDarkVariant();
    storeTheme(savedTheme, variant);
    applyTheme(savedTheme, variant);
  }, [savedTheme]);

  // Only a 401/403 says the session is over. A server error, a rate limit or a dropped connection says nothing about it:
  // ending the session there signed people out (and destroyed the real server session) whenever the API hiccuped.
  const SESSION_CHECK_ATTEMPTS = 3;
  const initAuth = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      let data;
      for (let attempt = 1; ; attempt++) {
        try {
          data = await authService.probeSession();
          break;
        } catch (error: unknown) {
          const status = (error as { response?: { status?: number } })?.response?.status;
          if (status === 401 || status === 403) throw error;
          if (attempt >= SESSION_CHECK_ATTEMPTS) {
            // Keep the cookie and the session; let the person retry instead of being sent to /login.
            dispatch({ type: 'SESSION_ERROR' });
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 600 * attempt));
        }
      }
      if (!data?.user) {
        // Signed out: a normal result. No cleanup calls needed - there is no session to end.
        dispatch({ type: 'LOGOUT' });
        if (matchesRoute(window.location.pathname, PROTECTED_PATHS)) router.replace('/login');
        return;
      }
      // Clear any legacy Firebase LOCAL persistence after the HttpOnly backend
      // session has been confirmed. Protected pages never need Firebase tokens.
      await signOut(auth).catch(() => { });
      dispatch({ type: 'LOGIN', payload: { user: data.user } });
      // Session-restore half of the onboarding gate (login() has the other half). Only authenticated
      // app routes are gated; /onboarding itself, auth pages, /f, /r, /invite stay untouched. `=== false`
      // so an absent field (older accounts) counts as onboarded.
      const path = window.location.pathname;
      if (data.user.onboardingCompleted === false && path !== '/onboarding' && matchesRoute(path, PROTECTED_PATHS)) {
        // Remember where they were going, so onboarding hands them back there (a template being applied, a form link...).
        router.replace(`/onboarding?next=${encodeURIComponent(path + window.location.search)}`);
      }
    } catch (error: unknown) {
      if (!['/verify-email', '/verification-code'].includes(window.location.pathname)) {
        await signOut(auth).catch(() => { });
      }
      await authService.logout().catch(() => { });
      dispatch({ type: 'LOGOUT' });
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (matchesRoute(window.location.pathname, PROTECTED_PATHS)) {
        router.replace(status === 403 ? '/login?reason=suspended' : '/login');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Start Firebase's local persistence setup while the user is reading/typing on
    // an auth page. Login/signup still await the same cached promise, but the work
    // is normally complete before the user selects the submit button.
    void authService.prepareFirebase().catch(() => { });
    void initAuth();
  }, [initAuth]);

  const login = useCallback(async (redirectTo?: string) => {
    // POST /api/auth/session's `user` can be missing fields (e.g. `name`) that GET
    // /api/auth/me returns fully — reuses the same call initAuth() already makes on every
    // reload, so the full profile shows immediately instead of only after a reload.
    //
    // Awaited, not fire-and-forget: a suspended account still gets a valid JWT from
    // /api/auth/session (blockSuspended() only guards routes that require an existing
    // session), so this getMe() call is the first point that actually reveals suspension.
    // The previous version swallowed this error and hard-navigated to /dashboard
    // regardless, landing the user on a broken page with no explanation before silently
    // bouncing back to /login — this is what showed up as "just reloading and showing
    // a 403 error" during testing. Now it never navigates on failure; it clears the
    // session and rethrows so LoginForm's existing catch block shows the backend's real
    // error message via getFriendlyErrorMessage (e.g. "Account is suspended"), the same
    // way any other login failure already displays.
    let data;
    try {
      data = await getMeSettlingOnboarding();
    } catch (error) {
      await authService.logout().catch(() => { });
      dispatch({ type: 'LOGOUT' });
      throw error;
    }
    dispatch({ type: 'LOGIN', payload: { user: data.user } });
    // An explicit internal `redirectTo` (invite link, public-form return) always wins so those flows
    // are never interrupted; otherwise an onboarding-incomplete user lands on /onboarding.
    const destination = redirectTo ?? (data.user.onboardingCompleted === false ? '/onboarding' : '/dashboard');
    // Hard navigation, not router.push: proxy.ts gates protected routes on the HttpOnly session
    // cookie written by the same-origin BFF. A soft client-side transition
    // can reuse a Router Cache entry for the destination from before the cookie existed and
    // bounce back to /login with no error (the login button spins forever).
    // A full navigation always sends a fresh request, so middleware sees the new cookie.
    // The hard navigation above is the fix, not the bug — see the comment above.
    window.location.href = destination;
  }, []);

  const logout = useCallback(async () => {
    await Promise.allSettled([authService.logout(), signOut(auth)]);
    // The next person to use this browser must not inherit this account's recent forms (the page is replaced right after,
    // so the effect above would not get to run).
    bindRecentFormsUser(null);
    dispatch({ type: 'LOGOUT' });
    // A soft Router transition can retain the protected dashboard shell from the
    // client cache even after the HttpOnly cookie is deleted. Replace the document
    // so Proxy performs a fresh session check, and remove this dashboard entry from
    // browser history so Back cannot reveal its stale UI after logout.
    window.location.replace('/login');
  }, []);

  // Only evaluated after a failed check (client-side), so server rendering never reads window.
  const showSessionError = state.sessionError && typeof window !== 'undefined' && matchesRoute(window.location.pathname, PROTECTED_PATHS);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, retrySession: () => void initAuth() }}>
      {showSessionError ? (
        <div className="flex min-h-screen items-center justify-center p-6">
          <div className="flex w-full max-w-md flex-col gap-4">
            <Alert variant="error" title="We couldn't check your sign-in">
              Beginso is having trouble right now. You are still signed in. Try again in a moment.
            </Alert>
            <Button variant="primary" onClick={() => void initAuth()}>
              Try again
            </Button>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}
