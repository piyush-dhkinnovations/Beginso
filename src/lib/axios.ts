import axios from 'axios';

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
    if ((status === 401 || status === 403) && !url.includes('/api/auth/') && !isFileDownload) {
      if (typeof window !== 'undefined') {
        void fetch('/api/backend/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          keepalive: true,
        }).finally(() => {
          window.location.href = status === 403 ? '/login?reason=suspended' : '/login';
        });
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
