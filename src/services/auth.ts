import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, getAdditionalUserInfo } from 'firebase/auth';
import axiosInstance from '@/lib/axios';

export async function signup(name: string, email: string, password: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();
    const { data } = await axiosInstance.post('/api/auth/session', { token: idToken, name });
    return data;
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'failed';
    throw new Error(errMessage);
  }
}

export async function login(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const idToken = await userCredential.user.getIdToken();
    const { data } = await axiosInstance.post(
      '/api/auth/session',
      { token: idToken },
      { timeout: 10_000 }
    );
    return data;
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'failed';
    throw new Error(errMessage);
  }
}

export async function getMe() {
  const { data } = await axiosInstance.get('/api/auth/me');
  return data;
}

export async function logout() {
  await axiosInstance.post('/api/auth/logout').catch(() => { });
}

export async function loginWithGoogle() {
  try {
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
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'failed';
    throw new Error(errMessage);
  }
}
