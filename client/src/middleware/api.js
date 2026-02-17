import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401/403/429 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const { status, data } = error.response || {};

    if (status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default api;
