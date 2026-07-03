'use client';

import React, { createContext, useReducer, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, saveToken, clearToken } from './tokenStorage';
import * as AuthService from '@/services/auth';
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
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_USER'; payload: { user: User } };

interface AuthContextValue extends AuthState {
  login: (token: string, user: User) => void;
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
    case 'SET_USER':
      return {
        ...state,
        user: action.payload.user,
        isAuthenticated: true,
        isLoading: false,
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
        const data = await AuthService.getMe();
        dispatch({ type: 'SET_USER', payload: { user: data.user } });
      } catch {
        clearToken();
        dispatch({ type: 'LOGOUT' });
        router.push('/login');
      }
    };

    initAuth();
  }, [router]);

  const login = useCallback((token: string, user: User) => {
    saveToken(token);
    dispatch({ type: 'LOGIN', payload: { user } });
  }, []);

  const logout = useCallback(async () => {
    AuthService.logout().catch(() => { });
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
