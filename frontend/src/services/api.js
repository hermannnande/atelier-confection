import axios from 'axios';

const baseURL = import.meta?.env?.VITE_API_URL || '/api';

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Lit le pays actif depuis le storage Zustand (cle 'country-storage').
 * On lit directement le storage pour eviter une dependance circulaire entre
 * countryStore.js (qui importe api) et ce fichier.
 */
function getActiveCountryCode() {
  try {
    const raw = localStorage.getItem('country-storage');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const code = parsed?.state?.currentCountry;
    return code && /^[A-Z]{2}$/.test(code) ? code : null;
  } catch (_) {
    return null;
  }
}

// Intercepteur pour ajouter le token + le pays actif à chaque requête
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Multi-pays : ajoute X-Country pour que le backend filtre les donnees
    const countryCode = getActiveCountryCode();
    if (countryCode) {
      config.headers['X-Country'] = countryCode;
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




