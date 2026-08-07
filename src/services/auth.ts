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

async function prepareFirebaseAuth(): Promise<void> {
  // A Firebase refresh token must not survive a closed browser. Beginso's durable
  // authentication is the same-origin HttpOnly backend cookie, not Firebase storage.
  await setPersistence(auth, browserSessionPersistence);
}

async function createBackendSession(user: User, name?: string, isNewUser?: boolean) {
  const idToken = await user.getIdToken();
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

  getPendingVerificationEmail() {
    return auth.currentUser?.email ?? null;
  },

  async resendVerificationEmail() {
    const user = auth.currentUser;
    if (!user) throw new Error('Sign in again before requesting another verification email.');
    await requestVerificationOtp(user);
  },

  async verifyEmailOtp(code: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('Sign in again to finish email verification.');
    const token = await user.getIdToken();
    await axiosInstance.post('/api/auth/email-verification/verify', { token, code });
    await reload(user);
    await user.getIdToken(true);
    return createBackendSession(user, user.displayName || undefined);
  },
};
