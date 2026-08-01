'use client';

import React, { createContext, useReducer, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, saveToken, clearToken } from './tokenStorage';
import { authService } from '@/services/auth';
import { signOut } from 'firebase/auth';
import { auth } from './firebase';

interface User {
  id: string;
  name: string;
  email: string;
  workspaceId?: string;
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
  login: (token: string) => Promise<void>;
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

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const router = useRouter();

  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      if (!token) {
        dispatch({ type: 'LOGOUT' });
        return;
      }

      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const data = await authService.getMe();
        dispatch({ type: 'LOGIN', payload: { user: data.user } });
      } catch (error: unknown) {
        clearToken();
        dispatch({ type: 'LOGOUT' });
        // A 403 here (as opposed to 401 for a merely expired/invalid token) means the
        // account was suspended after this session started — e.g. suspended in the
        // Super Admin Console while this tab stayed open. Flag it on the redirect so the
        // login page can show why, instead of silently bouncing with no explanation.
        const status = (error as { response?: { status?: number } })?.response?.status;
        router.push(status === 403 ? '/login?reason=suspended' : '/login');
      }
    };

    initAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async (token: string) => {
    saveToken(token);
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
      data = await authService.getMe();
    } catch (error) {
      clearToken();
      dispatch({ type: 'LOGOUT' });
      throw error;
    }
    dispatch({ type: 'LOGIN', payload: { user: data.user } });
    // Hard navigation, not router.push: proxy.ts middleware gates /dashboard on the
    // has_session marker cookie saveToken() just wrote. A soft client-side transition
    // can reuse a Router Cache entry for /dashboard from before the cookie existed and
    // bounce back to /login with no error (the login button spins forever).
    // A full navigation always sends a fresh request, so middleware sees the new cookie.
    window.location.href = '/dashboard';
  }, []);

  const logout = useCallback(async () => {
    authService.logout().catch(() => { });
    signOut(auth).catch(() => { });
    clearToken();
    dispatch({ type: 'LOGOUT' });
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
