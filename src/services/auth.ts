import { auth } from '@/lib/firebase';
import {
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  getAdditionalUserInfo,
  GoogleAuthProvider,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth';
import axiosInstance from '@/lib/axios';

function appUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
  return new URL(path, base).toString();
}

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

export const authService = {
  async signup(name: string, email: string, password: string) {
    await prepareFirebaseAuth();
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    await sendEmailVerification(userCredential.user, { url: appUrl('/verify-email') });
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
    await prepareFirebaseAuth();
    await sendPasswordResetEmail(auth, email, { url: appUrl('/login') });
  },

  getPendingVerificationEmail() {
    return auth.currentUser?.email ?? null;
  },

  async resendVerificationEmail() {
    const user = auth.currentUser;
    if (!user) throw new Error('Sign in again before requesting another verification email.');
    await sendEmailVerification(user, { url: appUrl('/verify-email') });
  },

  async completeEmailVerification() {
    const user = auth.currentUser;
    if (!user) throw new Error('Sign in again to finish email verification.');
    await reload(user);
    if (!user.emailVerified) return false;
    await createBackendSession(user, user.displayName || undefined);
    return true;
  },
};
