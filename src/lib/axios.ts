import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      import('./tokenStorage').then(({ clearToken }) => {
        clearToken();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      });
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
