import axios from 'axios';

const baseURL = import.meta?.env?.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token à chaque requête
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = String(error.config?.url || '');
    const isLoginRequest = url.includes('/auth/login');
    const isRegisterRequest = url.includes('/auth/register');
    
    // Routes qui gèrent leurs propres erreurs (ne pas déconnecter automatiquement)
    const routesWithCustomErrorHandling = [
      '/sessions-caisse',
      '/users',
    ];
    const hasCustomErrorHandling = routesWithCustomErrorHandling.some(route => url.includes(route));

    if (status === 401 && !isLoginRequest && !isRegisterRequest && !hasCustomErrorHandling) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;




