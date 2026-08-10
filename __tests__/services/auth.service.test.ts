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
    vi.mocked(reload).mockResolvedValue();
    vi.mocked(signOut).mockResolvedValue();
  });

  // ─── signup() ─────────────────────────────────────────────────────────────

  describe('signup()', () => {
    it('creates a Firebase user and asks the Beginso backend to send an OTP', async () => {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      const user = { email: 'test@test.com', getIdToken: vi.fn().mockResolvedValue('firebase.id.token') };
      (createUserWithEmailAndPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        user,
      });
      mockPost.mockResolvedValueOnce({ status: 202 });

      const { authService } = await import('@/services/auth');
      await authService.prepareFirebase();
      await authService.prepareFirebase();
      const result = await authService.signup('Test User', 'test@test.com', 'password123');

      expect(setPersistence).toHaveBeenCalledOnce();
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'test@test.com', 'password123');
      expect(updateProfile).toHaveBeenCalledWith(user, { displayName: 'Test User' });
      expect(mockPost).toHaveBeenCalledOnce();
      expect(mockPost).toHaveBeenCalledWith('/api/auth/email-verification', { token: 'firebase.id.token' });
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

    it('requests a verification email and does not create a session for an unverified password user', async () => {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const getIdToken = vi.fn().mockResolvedValueOnce('pending.id.token');
      (signInWithEmailAndPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        user: { emailVerified: false, getIdToken },
      });
      mockPost.mockResolvedValueOnce({ status: 202 });

      const { authService } = await import('@/services/auth');
      await expect(authService.login('test@test.com', 'password123')).rejects.toMatchObject({
        code: 'auth/email-not-verified',
      });
      expect(getIdToken).toHaveBeenCalledOnce();
      expect(mockPost).toHaveBeenCalledOnce();
      expect(mockPost).toHaveBeenCalledWith('/api/auth/email-verification', {
        token: 'pending.id.token',
      });
      expect(mockPost).not.toHaveBeenCalledWith(
        '/api/auth/session',
        expect.anything(),
        expect.anything()
      );
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
    it('asks the Beginso backend to send a branded password-reset email', async () => {
      mockPost.mockResolvedValueOnce({ status: 202 });
      const { authService } = await import('@/services/auth');
      await authService.requestPasswordReset('  test@test.com  ');

      expect(mockPost).toHaveBeenCalledWith('/api/auth/forgot-password', { email: 'test@test.com' });
    });

    it('notifies the Beginso backend after Firebase completes a password reset', async () => {
      mockPost.mockResolvedValueOnce({ status: 200 });
      const { authService } = await import('@/services/auth');
      await authService.notifyPasswordResetCompleted('  test@test.com  ');

      expect(mockPost).toHaveBeenCalledWith('/api/auth/confirm-password-reset', {
        email: 'test@test.com',
      });
    });

    it('asks the Beginso backend to resend an OTP for the pending Firebase user', async () => {
      const { auth } = await import('@/lib/firebase');
      const user = { email: 'test@test.com', getIdToken: vi.fn().mockResolvedValue('firebase.id.token') };
      (auth as { currentUser: unknown }).currentUser = user;
      mockPost.mockResolvedValueOnce({ status: 202 });

      const { authService } = await import('@/services/auth');
      await authService.resendVerificationEmail();

      expect(mockPost).toHaveBeenCalledWith('/api/auth/email-verification', { token: 'firebase.id.token' });
      (auth as { currentUser: unknown }).currentUser = null;
    });

    it('reveals and validates a six-digit verification code through the backend', async () => {
      mockPost.mockResolvedValueOnce({
        data: { code: '482175', expiresAt: '2026-08-07T15:40:00.000Z' },
      });

      const { authService } = await import('@/services/auth');
      await expect(authService.revealVerificationCode('opaque-ticket')).resolves.toEqual({
        code: '482175',
        expiresAt: '2026-08-07T15:40:00.000Z',
      });
      expect(mockPost).toHaveBeenCalledWith('/api/auth/email-verification/reveal', {
        ticket: 'opaque-ticket',
      });
    });

    it('rejects a malformed verification-code response', async () => {
      mockPost.mockResolvedValueOnce({ data: { code: '123', expiresAt: 'not-a-date' } });

      const { authService } = await import('@/services/auth');
      await expect(authService.revealVerificationCode('opaque-ticket')).rejects.toThrow(
        'invalid response'
      );
    });

    it('verifies the OTP, refreshes the Firebase token, and then creates the session', async () => {
      const { auth } = await import('@/lib/firebase');
      const user = {
        displayName: 'Test User',
        getIdToken: vi.fn()
          .mockResolvedValueOnce('pending.id.token')
          .mockResolvedValueOnce('verified.id.token')
          .mockResolvedValueOnce('verified.id.token'),
      };
      (auth as { currentUser: unknown }).currentUser = user;
      mockPost
        .mockResolvedValueOnce({ data: { verified: true } })
        .mockResolvedValueOnce({ data: { user: { id: 'u1' } } });

      const { authService } = await import('@/services/auth');
      await authService.verifyEmailOtp('123456');

      expect(mockPost).toHaveBeenNthCalledWith(1, '/api/auth/email-verification/verify', {
        token: 'pending.id.token',
        code: '123456',
      });
      expect(reload).toHaveBeenCalledWith(user);
      expect(user.getIdToken).toHaveBeenCalledWith(true);
      expect(user.getIdToken).toHaveBeenCalledTimes(2);
      expect(mockPost).toHaveBeenNthCalledWith(
        2,
        '/api/auth/session',
        { token: 'verified.id.token', name: 'Test User' },
        { timeout: 10_000 }
      );
      expect(signOut).toHaveBeenCalled();
      (auth as { currentUser: unknown }).currentUser = null;
    });
  });
});
