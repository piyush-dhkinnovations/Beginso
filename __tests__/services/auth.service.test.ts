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
    // Set MOCK = true so we exercise the mock branches
    vi.stubEnv('NEXT_PUBLIC_USE_MOCK', 'true');
  });

  // ─── signup() ─────────────────────────────────────────────────────────────

  describe('signup()', () => {
    it('sends POST to /api/auth/session with token, name, email in mock mode', async () => {
      const mockSessionData = {
        user: { id: 'u1', name: 'Test User', email: 'test@test.com' },
        workspace: { id: 'ws1', name: 'Test WS' },
      };
      mockPost.mockResolvedValueOnce({ data: mockSessionData });

      const { signup } = await import('@/services/auth');
      const result = await signup('Test User', 'test@test.com', 'password123');

      expect(mockPost).toHaveBeenCalledOnce();
      expect(mockPost).toHaveBeenCalledWith('/api/auth/session', {
        token: 'mock.jwt.token',
        name: 'Test User',
        email: 'test@test.com',
      });
      expect(result).toEqual(mockSessionData);
    });
  });

  // ─── login() ──────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('sends POST to /api/auth/session with token and email in mock mode', async () => {
      const mockSessionData = {
        user: { id: 'u1', name: 'Test User', email: 'test@test.com' },
        workspace: { id: 'ws1', name: 'Test WS' },
      };
      mockPost.mockResolvedValueOnce({ data: mockSessionData });

      const { login } = await import('@/services/auth');
      const result = await login('test@test.com', 'password123');

      expect(mockPost).toHaveBeenCalledOnce();
      expect(mockPost.mock.calls[0][0]).toBe('/api/auth/session');
      expect(result).toEqual(mockSessionData);
    });
  });

  // ─── getMe() ──────────────────────────────────────────────────────────────

  describe('getMe()', () => {
    it('returns mock user when MOCK mode is on without making network request', async () => {
      const { getMe } = await import('@/services/auth');
      const result = await getMe();

      expect(result.user).toBeDefined();
      expect(result.user.id).toBe('mock-user-id');
      // In mock mode, axiosInstance.get is NOT called
      expect(mockGet).not.toHaveBeenCalled();
    });
  });

  // ─── logout() ─────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('catches backend errors silently — does not throw', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network error'));

      const { logout } = await import('@/services/auth');
      await expect(logout()).resolves.toBeUndefined();
    });

    it('calls POST /api/auth/logout in mock mode', async () => {
      mockPost.mockResolvedValueOnce({ data: {} });

      const { logout } = await import('@/services/auth');
      await logout();

      expect(mockPost).toHaveBeenCalledWith('/api/auth/logout');
    });
  });

  // ─── Real mode: login sends 10s timeout ───────────────────────────────────

  describe('Real mode: login() sends 10s timeout', () => {
    it('passes timeout: 10_000 in the config when MOCK=false', async () => {
      vi.stubEnv('NEXT_PUBLIC_USE_MOCK', 'false');

      const { signInWithEmailAndPassword } = await import('firebase/auth');
      (signInWithEmailAndPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        user: {
          getIdToken: vi.fn().mockResolvedValueOnce('real.id.token'),
        },
      });
      mockPost.mockResolvedValueOnce({ data: { user: {}, workspace: {} } });

      const { login } = await import('@/services/auth');
      await login('user@example.com', 'pass123');

      const [, , config] = mockPost.mock.calls[0];
      expect(config?.timeout).toBe(10_000);
    });
  });
});
