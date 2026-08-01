import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
import axiosInstance from '@/lib/axios';

export const authService = {
  async signup(name: string, email: string, password: string) {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();
    const { data } = await axiosInstance.post('/api/auth/session', { token: idToken, name });
    return data;
  },

  async login(email: string, password: string) {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();
    const { data } = await axiosInstance.post(
      '/api/auth/session',
      { token: idToken },
      { timeout: 10_000 }
    );
    return data;
  },

  async getMe() {
    const { data } = await axiosInstance.get('/api/auth/me');
    return data;
  },

  async logout() {
    await axiosInstance.post('/api/auth/logout').catch(() => { });
  },

  async loginWithGoogle() {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const additionalInfo = getAdditionalUserInfo(userCredential);
    const isNewUser = additionalInfo?.isNewUser || false;
    const idToken = await userCredential.user.getIdToken();
    const { data } = await axiosInstance.post(
      '/api/auth/session',
      {
        token: idToken,
        name: userCredential.user.displayName || undefined,
        isNewUser
      },
      { timeout: 10_000 }
    );
    return data;
  },
};
