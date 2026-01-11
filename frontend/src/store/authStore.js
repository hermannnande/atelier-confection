import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        try {
          const response = await api.post('/auth/login', { email, password });
          const { token, user } = response.data;
          
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          
          set({ user, token, isAuthenticated: true });
          return { success: true };
        } catch (error) {
          return { 
            success: false, 
            message: error.response?.data?.message || 'Erreur de connexion' 
          };
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        const token = localStorage.getItem('token');
        if (!token) {
          set({ isAuthenticated: false });
          return false;
        }

        try {
          const response = await api.get('/auth/me');
          set({ user: response.data.user, token, isAuthenticated: true });
          return true;
        } catch (error) {
          set({ user: null, token: null, isAuthenticated: false });
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);




