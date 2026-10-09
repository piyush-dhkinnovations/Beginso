import axios from 'axios';

function getApiErrorCode(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const body = data as {
    code?: unknown;
    message?: unknown;
    error?: { code?: unknown; message?: unknown };
  };
  const candidates = [body.code, body.error?.code, body.message, body.error?.message];
  if (candidates.includes('ACCOUNT_SUSPENDED')) return 'ACCOUNT_SUSPENDED';
  return candidates.find((value): value is string => typeof value === 'string');
}

const axiosInstance = axios.create({
  baseURL: '/api/backend',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url: string = error.config?.url ?? '';
    const isFileDownload = /\/api\/responses\/[^/]+\/file\/[^/]+/.test(url);
    const isSuspended = status === 403 && getApiErrorCode(error.response?.data) === 'ACCOUNT_SUSPENDED';
    // A normal 403 is resource-scoped (for example, another workspace's response) and must
    // remain available to the page's access-denied UI. Only an expired/missing session (401)
    // or the backend's explicit suspension code destroys the whole session.
    if ((status === 401 || isSuspended) && !url.includes('/api/auth/') && !isFileDownload) {
      if (typeof window !== 'undefined') {
        void fetch('/api/backend/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          keepalive: true,
        }).catch(() => {}).finally(() => {
          window.location.href = isSuspended ? '/login?reason=suspended' : '/login';
        });
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
