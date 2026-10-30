import axios from 'axios';

export const API_BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:5000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('campusconnect_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear token if invalid
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('campusconnect_token');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
