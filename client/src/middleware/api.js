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

    // Handle 403 - Feature not available or admin required
    if (status === 403) {
      const errorMsg = data?.error || '';
      if (errorMsg.includes('Feature')) {
        // Feature not available in plan - dispatch event for UI to handle
        window.dispatchEvent(new CustomEvent('featureDenied', { detail: data }));
      } else if (errorMsg.includes('Admin')) {
        window.dispatchEvent(new CustomEvent('adminRequired', { detail: data }));
      }
    }

    // Handle 429 - Usage limit reached
    if (status === 429) {
      window.dispatchEvent(new CustomEvent('limitReached', { detail: data }));
    }

    return Promise.reject(error);
  }
);

export default api;
