'use client';

import React, { createContext, useReducer, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';
import { PROTECTED_PATHS, matchesRoute } from './authRoutes';

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
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

type AuthAction =
  | { type: 'LOGIN'; payload: { user: User } }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; payload: boolean };

interface AuthContextValue extends AuthState {
  login: (redirectTo?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true, // starts loading while verifying token
};

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
      };
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

  useEffect(() => {
    // Start Firebase's local persistence setup while the user is reading/typing on
    // an auth page. Login/signup still await the same cached promise, but the work
    // is normally complete before the user selects the submit button.
    void authService.prepareFirebase().catch(() => { });

    const initAuth = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const data = await authService.probeSession();
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
          router.replace('/onboarding');
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
    };

    initAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    dispatch({ type: 'LOGOUT' });
    // A soft Router transition can retain the protected dashboard shell from the
    // client cache even after the HttpOnly cookie is deleted. Replace the document
    // so Proxy performs a fresh session check, and remove this dashboard entry from
    // browser history so Back cannot reveal its stale UI after logout.
    window.location.replace('/login');
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
