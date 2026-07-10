/**
 * __tests__/auth.service.test.ts
 * Feature: sprint-1-frontend-auth
 * Tests: Auth Service — signup, login, getMe, logout functions
 * Requirements: 6.1, 6.4, 6.5, 8.1, 13.1, 13.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';


// ─── Mock Firebase auth ─────────────────────────────────────────────────────
vi.mock('@/lib/firebase', () => ({
  auth: {},
}));

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithPopup: vi.fn(),
  getAdditionalUserInfo: vi.fn(),
}));

// ─── Mock Axios instance ────────────────────────────────────────────────────
vi.mock('@/lib/axios', () => {
  const mockPost = vi.fn();
  const mockGet = vi.fn();
  return {
    default: {
      post: mockPost,
      get: mockGet,
      interceptors: {
        response: { use: vi.fn() },
      },
    },
  };
});

// ─── Mock tokenStorage ──────────────────────────────────────────────────────
vi.mock('@/lib/tokenStorage', () => ({
  getToken: vi.fn(() => 'stored.jwt.token'),
  saveToken: vi.fn(),
  clearToken: vi.fn(),
}));

import axiosInstance from '@/lib/axios';


const mockPost = axiosInstance.post as ReturnType<typeof vi.fn>;
const mockGet = axiosInstance.get as ReturnType<typeof vi.fn>;

describe('Auth Service', () => {
  beforeEach(() => {
    vi.resetModules();
    mockPost.mockReset();
    mockGet.mockReset();
  });

  // ─── signup() ─────────────────────────────────────────────────────────────

  describe('signup()', () => {
    it('creates a Firebase user then posts the ID token to /api/auth/session', async () => {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      (createUserWithEmailAndPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        user: { getIdToken: vi.fn().mockResolvedValueOnce('real.id.token') },
      });
      const mockSessionData = {
        user: { id: 'u1', name: 'Test User', email: 'test@test.com' },
        workspace: { id: 'ws1', name: 'Test WS' },
      };
      mockPost.mockResolvedValueOnce({ data: mockSessionData });

      const { signup } = await import('@/services/auth');
      const result = await signup('Test User', 'test@test.com', 'password123');

      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'test@test.com', 'password123');
      expect(mockPost).toHaveBeenCalledWith('/api/auth/session', { token: 'real.id.token', name: 'Test User' });
      expect(result).toEqual(mockSessionData);
    });

    it('throws when Firebase signup fails', async () => {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      (createUserWithEmailAndPassword as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Email already in use'));

      const { signup } = await import('@/services/auth');
      await expect(signup('Test User', 'test@test.com', 'password123')).rejects.toThrow('Email already in use');
    });
  });

  // ─── login() ──────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('signs in with Firebase then posts the ID token with a 10s timeout', async () => {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      (signInWithEmailAndPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        user: { getIdToken: vi.fn().mockResolvedValueOnce('real.id.token') },
      });
      const mockSessionData = {
        user: { id: 'u1', name: 'Test User', email: 'test@test.com' },
        workspace: { id: 'ws1', name: 'Test WS' },
      };
      mockPost.mockResolvedValueOnce({ data: mockSessionData });

      const { login } = await import('@/services/auth');
      const result = await login('test@test.com', 'password123');

      expect(mockPost).toHaveBeenCalledWith('/api/auth/session', { token: 'real.id.token' }, { timeout: 10_000 });
      expect(result).toEqual(mockSessionData);
    });
  });

  // ─── getMe() ──────────────────────────────────────────────────────────────

  describe('getMe()', () => {
    it('fetches the current user from /api/auth/me', async () => {
      mockGet.mockResolvedValueOnce({ data: { user: { id: 'u1', name: 'Test User', email: 'test@test.com' } } });

      const { getMe } = await import('@/services/auth');
      const result = await getMe();

      expect(mockGet).toHaveBeenCalledWith('/api/auth/me');
      expect(result.user.id).toBe('u1');
    });
  });

  // ─── logout() ─────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('posts to /api/auth/logout', async () => {
      mockPost.mockResolvedValueOnce({ data: {} });

      const { logout } = await import('@/services/auth');
      await logout();

      expect(mockPost).toHaveBeenCalledWith('/api/auth/logout');
    });

    it('catches backend errors silently — does not throw', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network error'));

      const { logout } = await import('@/services/auth');
      await expect(logout()).resolves.toBeUndefined();
    });
  });
});
