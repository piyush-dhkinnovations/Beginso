/**
 * __tests__/auth.service.test.ts
 * Feature: sprint-1-frontend-auth
 * Tests: Auth Service — signup, login, getMe, logout functions
 * Requirements: 6.1, 6.4, 6.5, 8.1, 13.1, 13.5
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';


// ─── Mock Firebase auth ─────────────────────────────────────────────────────
vi.mock('@/lib/firebase', () => ({
  auth: { currentUser: null },
}));

vi.mock('firebase/auth', () => ({
  browserSessionPersistence: { type: 'SESSION' },
  createUserWithEmailAndPassword: vi.fn(),
  getAdditionalUserInfo: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  reload: vi.fn(),
  sendEmailVerification: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  setPersistence: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
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

import axiosInstance from '@/lib/axios';
import {
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signOut,
  updateProfile,
} from 'firebase/auth';


const mockPost = axiosInstance.post as ReturnType<typeof vi.fn>;
const mockGet = axiosInstance.get as ReturnType<typeof vi.fn>;

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPost.mockReset();
    mockGet.mockReset();
    vi.mocked(setPersistence).mockResolvedValue();
    vi.mocked(updateProfile).mockResolvedValue();
    vi.mocked(sendEmailVerification).mockResolvedValue();
    vi.mocked(sendPasswordResetEmail).mockResolvedValue();
    vi.mocked(reload).mockResolvedValue();
    vi.mocked(signOut).mockResolvedValue();
  });

  // ─── signup() ─────────────────────────────────────────────────────────────

  describe('signup()', () => {
    it('creates a Firebase user and sends verification without creating a backend session', async () => {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const user = { email: 'test@test.com' };
      (createUserWithEmailAndPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        user,
      });

      const { authService } = await import('@/services/auth');
      const result = await authService.signup('Test User', 'test@test.com', 'password123');

      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'test@test.com', 'password123');
      expect(updateProfile).toHaveBeenCalledWith(user, { displayName: 'Test User' });
      expect(sendEmailVerification).toHaveBeenCalledWith(user, expect.objectContaining({ url: expect.stringContaining('/verify-email') }));
      expect(mockPost).not.toHaveBeenCalled();
      expect(result).toEqual({ email: 'test@test.com' });
    });

    it('throws when Firebase signup fails', async () => {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      (createUserWithEmailAndPassword as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Email already in use'));

      const { authService } = await import('@/services/auth');
      await expect(authService.signup('Test User', 'test@test.com', 'password123')).rejects.toThrow('Email already in use');
    });
  });

  // ─── login() ──────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('signs in with Firebase then posts the ID token with a 10s timeout', async () => {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      (signInWithEmailAndPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        user: { emailVerified: true, getIdToken: vi.fn().mockResolvedValueOnce('real.id.token') },
      });
      const mockSessionData = {
        user: { id: 'u1', name: 'Test User', email: 'test@test.com' },
        workspace: { id: 'ws1', name: 'Test WS' },
      };
      mockPost.mockResolvedValueOnce({ data: mockSessionData });

      const { authService } = await import('@/services/auth');
      const result = await authService.login('test@test.com', 'password123');

      expect(mockPost).toHaveBeenCalledWith('/api/auth/session', { token: 'real.id.token' }, { timeout: 10_000 });
      expect(signOut).toHaveBeenCalled();
      expect(result).toEqual(mockSessionData);
    });

    it('does not create a backend session for an unverified password user', async () => {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      (signInWithEmailAndPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        user: { emailVerified: false },
      });

      const { authService } = await import('@/services/auth');
      await expect(authService.login('test@test.com', 'password123')).rejects.toMatchObject({
        code: 'auth/email-not-verified',
      });
      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  // ─── loginWithGoogle() ─────────────────────────────────────────────────────

  describe('loginWithGoogle()', () => {
    it('signs in with a Google popup then posts the ID token to /api/auth/session', async () => {
      const { signInWithPopup, getAdditionalUserInfo } = await import('firebase/auth');
      (signInWithPopup as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        user: { displayName: 'Test User', getIdToken: vi.fn().mockResolvedValueOnce('real.id.token') },
      });
      (getAdditionalUserInfo as ReturnType<typeof vi.fn>).mockReturnValueOnce({ isNewUser: true });
      const mockSessionData = { token: 'session.jwt', user: { id: 'u1', name: 'Test User', email: 'test@test.com' } };
      mockPost.mockResolvedValueOnce({ data: mockSessionData });

      const { authService } = await import('@/services/auth');
      const result = await authService.loginWithGoogle();

      expect(mockPost).toHaveBeenCalledWith(
        '/api/auth/session',
        { token: 'real.id.token', name: 'Test User', isNewUser: true },
        { timeout: 10_000 }
      );
      expect(signOut).toHaveBeenCalled();
      expect(result).toEqual(mockSessionData);
    });

    it('throws when the Google popup fails', async () => {
      const { signInWithPopup } = await import('firebase/auth');
      (signInWithPopup as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('popup-closed-by-user'));

      const { authService } = await import('@/services/auth');
      await expect(authService.loginWithGoogle()).rejects.toThrow('popup-closed-by-user');
    });
  });

  // ─── getMe() ──────────────────────────────────────────────────────────────

  describe('getMe()', () => {
    it('fetches the current user from /api/auth/me', async () => {
      mockGet.mockResolvedValueOnce({ data: { user: { id: 'u1', name: 'Test User', email: 'test@test.com' } } });

      const { authService } = await import('@/services/auth');
      const result = await authService.getMe();

      expect(mockGet).toHaveBeenCalledWith('/api/auth/me');
      expect(result.user.id).toBe('u1');
    });
  });

  // ─── logout() ─────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('posts to /api/auth/logout', async () => {
      mockPost.mockResolvedValueOnce({ data: {} });

      const { authService } = await import('@/services/auth');
      await authService.logout();

      expect(mockPost).toHaveBeenCalledWith('/api/auth/logout');
    });

    it('catches backend errors silently — does not throw', async () => {
      mockPost.mockRejectedValueOnce(new Error('Network error'));

      const { authService } = await import('@/services/auth');
      await expect(authService.logout()).resolves.toBeUndefined();
    });
  });

  describe('verification and password recovery', () => {
    it('sends a non-session password reset action link', async () => {
      const { authService } = await import('@/services/auth');
      await authService.requestPasswordReset('test@test.com');

      expect(sendPasswordResetEmail).toHaveBeenCalledWith(
        expect.anything(),
        'test@test.com',
        expect.objectContaining({ url: expect.stringContaining('/login') })
      );
      expect(mockPost).not.toHaveBeenCalled();
    });

    it('resends verification only for the pending Firebase user', async () => {
      const { auth } = await import('@/lib/firebase');
      const user = { email: 'test@test.com' };
      (auth as { currentUser: unknown }).currentUser = user;

      const { authService } = await import('@/services/auth');
      await authService.resendVerificationEmail();

      expect(sendEmailVerification).toHaveBeenCalledWith(
        user,
        expect.objectContaining({ url: expect.stringContaining('/verify-email') })
      );
      (auth as { currentUser: unknown }).currentUser = null;
    });

    it('creates a backend session only after verification is observed', async () => {
      const { auth } = await import('@/lib/firebase');
      const user = {
        emailVerified: true,
        displayName: 'Test User',
        getIdToken: vi.fn().mockResolvedValue('verified.id.token'),
      };
      (auth as { currentUser: unknown }).currentUser = user;
      mockPost.mockResolvedValueOnce({ data: { user: { id: 'u1' } } });

      const { authService } = await import('@/services/auth');
      await expect(authService.completeEmailVerification()).resolves.toBe(true);

      expect(reload).toHaveBeenCalledWith(user);
      expect(mockPost).toHaveBeenCalledWith(
        '/api/auth/session',
        { token: 'verified.id.token', name: 'Test User' },
        { timeout: 10_000 }
      );
      expect(signOut).toHaveBeenCalled();
      (auth as { currentUser: unknown }).currentUser = null;
    });
  });
});
