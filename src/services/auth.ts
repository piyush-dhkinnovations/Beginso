import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import axiosInstance from '@/lib/axios';
import { getToken } from '@/lib/tokenStorage';

const MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';


export async function signup(name: string, email: string, password: string) {
  if (MOCK) {
    const { data } = await axiosInstance.post('/api/auth/session', { token: 'mock.jwt.token', name, email });
    return data;
  }
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
  if (MOCK) {
    const { data } = await axiosInstance.post('/api/auth/session', { token: 'mock.jwt.token', email });
    return data;
  }
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
  if (MOCK) {
    return {
      user: { id: 'mock-user-id', name: 'Mock User', email: 'mock@example.com', workspaceId: 'mock-ws-id' }
    };
  }
  const token = getToken();
  const { data } = await axiosInstance.get('/api/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function logout() {
  if (MOCK) {
    await axiosInstance.post('/api/auth/logout').catch(() => { });
    return;
  }
  const token = getToken();
  await axiosInstance.post('/api/auth/logout', {}, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => { });
}

export async function loginWithGoogle() {
  if (MOCK) {
    const { data } = await axiosInstance.post('/api/auth/session', {
      token: 'mock.jwt.token',
      email: 'mock-google-user@example.com',
      name: 'Mock Google User',
    });
    return data;
  }
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const idToken = await userCredential.user.getIdToken();
    const { data } = await axiosInstance.post(
      '/api/auth/session',
      { token: idToken, name: userCredential.user.displayName || undefined },
      { timeout: 10_000 }
    );
    return data;
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : 'failed';
    throw new Error(errMessage);
  }
}
