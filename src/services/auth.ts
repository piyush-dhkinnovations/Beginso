import { auth } from '@/lib/firebase';
import {
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  reload,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import axiosInstance from '@/lib/axios';

export interface VerificationCodeReveal {
  code: string;
  expiresAt: string;
}

let authPreparation: Promise<void> | null = null;

async function prepareFirebaseAuth(): Promise<void> {
  // A Firebase refresh token must not survive a closed browser. Beginso's durable
  // authentication is the same-origin HttpOnly backend cookie, not Firebase storage.
  if (!authPreparation) {
    authPreparation = setPersistence(auth, browserSessionPersistence).catch((error) => {
      authPreparation = null;
      throw error;
    });
  }
  await authPreparation;
}

async function createBackendSession(
  user: User,
  name?: string,
  isNewUser?: boolean,
  verifiedIdToken?: string
) {
  const idToken = verifiedIdToken ?? await user.getIdToken();
  const { data } = await axiosInstance.post(
    '/api/auth/session',
    { token: idToken, ...(name ? { name } : {}), ...(isNewUser === undefined ? {} : { isNewUser }) },
    { timeout: 10_000 }
  );
  // The backend cookie is now the only session credential the app needs. Removing
  // Firebase state prevents background refresh-token calls from protected pages.
  await signOut(auth);
  return data;
}

async function requestVerificationOtp(user: User): Promise<void> {
  const token = await user.getIdToken();
  await axiosInstance.post('/api/auth/email-verification', { token });
}

export const authService = {
  async prepareFirebase() {
    await prepareFirebaseAuth();
  },

  async signup(name: string, email: string, password: string) {
    await prepareFirebaseAuth();
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    await requestVerificationOtp(userCredential.user);
    return { email: userCredential.user.email };
  },

  async login(email: string, password: string) {
    await prepareFirebaseAuth();
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    if (!userCredential.user.emailVerified) {
      // Logging in is a valid entry point to the verification flow. Request a fresh
      // Beginso email before redirecting so the user does not land on the code page
      // with Resend as the only way to receive mail.
      await requestVerificationOtp(userCredential.user);
      const error = new Error('Verify your email before signing in.') as Error & { code: string };
      error.code = 'auth/email-not-verified';
      throw error;
    }
    return createBackendSession(userCredential.user);
  },

  async getMe() {
    const { data } = await axiosInstance.get('/api/auth/me');
    return data;
  },

  // Confirmed live 17 Aug 2026 per a direct backend report (commit a7a5185) — idempotent, also
  // triggers a "welcome" notification server-side. Called after the onboarding page's
  // workspace-name save succeeds; note PATCH /api/workspaces/current also sets this flag as a
  // side effect per the same report, so this call is a deliberate belt-and-suspenders confirm,
  // not the only way it gets set. Caught by the caller rather than blocking navigation to
  // /dashboard even so — never something the user should be stuck behind.
  async completeOnboarding() {
    await axiosInstance.post('/api/users/me/onboarding-complete');
  },

  async logout() {
    await axiosInstance.post('/api/auth/logout').catch(() => { });
  },

  async loginWithGoogle() {
    await prepareFirebaseAuth();
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const additionalInfo = getAdditionalUserInfo(userCredential);
    const isNewUser = additionalInfo?.isNewUser || false;
    return createBackendSession(userCredential.user, userCredential.user.displayName || undefined, isNewUser);
  },

  async requestPasswordReset(email: string) {
    await axiosInstance.post('/api/auth/forgot-password', { email: email.trim() });
  },

  async notifyPasswordResetCompleted(email: string) {
    await axiosInstance.post('/api/auth/confirm-password-reset', { email: email.trim() });
  },

  getPendingVerificationEmail() {
    return auth.currentUser?.email ?? null;
  },

  async resendVerificationEmail() {
    const user = auth.currentUser;
    if (!user) throw new Error('Sign in again before requesting another verification email.');
    await requestVerificationOtp(user);
  },

  async revealVerificationCode(ticket: string): Promise<VerificationCodeReveal> {
    const { data } = await axiosInstance.post<VerificationCodeReveal>(
      '/api/auth/email-verification/reveal',
      { ticket }
    );
    if (!/^\d{6}$/.test(data.code) || Number.isNaN(Date.parse(data.expiresAt))) {
      throw new Error('The verification service returned an invalid response.');
    }
    return data;
  },

  async verifyEmailOtp(code: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('Sign in again to finish email verification.');
    const token = await user.getIdToken();
    await axiosInstance.post('/api/auth/email-verification/verify', { token, code });
    await reload(user);
    const verifiedToken = await user.getIdToken(true);
    return createBackendSession(user, user.displayName || undefined, undefined, verifiedToken);
  },
};
