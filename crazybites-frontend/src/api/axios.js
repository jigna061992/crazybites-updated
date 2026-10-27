// src/api/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
});

// har request sathe token attach karvo — jem middleware har request check kare em
api.interceptors.request.use((config) => {
  // Admin "View as user" (read-only) mode: GET sivay kai nahi chalse (logout sivay)
  if (localStorage.getItem('admin_token_backup')) {
    const m = (config.method || 'get').toLowerCase();
    if (m !== 'get' && !String(config.url).includes('/logout')) {
      return Promise.reject({
        response: { status: 403, data: { success: false, message: 'View-only mode: admin user ma kai change kari shakto nathi.' } },
        message: 'View-only mode',
      });
    }
  }
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// token expire/invalid hoy to auto logout
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;