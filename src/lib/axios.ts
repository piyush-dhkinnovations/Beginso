import axios from 'axios';
import { getToken } from './tokenStorage';

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    // Excludes /api/auth/* — those routes already have their own bespoke suspension
    // handling (authContext's login() shows a friendly inline message without navigating
    // away; initAuth's session-restore redirects with ?reason=suspended). This branch is
    // for every OTHER route: blockSuspended() returns 403 on any protected endpoint once an
    // account is suspended mid-session, and until now nothing but /api/auth/me's own call
    // site reacted to that — a suspended user's next unrelated fetch (e.g. GET /api/forms)
    // just surfaced as a local "Failed to load forms" error instead of being sent back to
    // login with an explanation.
    const url: string = error.config?.url ?? '';
    if (status === 401 || (status === 403 && !url.includes('/api/auth/'))) {
      import('./tokenStorage').then(({ clearToken }) => {
        clearToken();
        if (typeof window !== 'undefined') {
          window.location.href = status === 403 ? '/login?reason=suspended' : '/login';
        }
      });
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
