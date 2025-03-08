import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  accessToken: string | null;
  username: string | null;
  isAuthenticated: boolean;
  setAuth: (accessToken: string, username: string) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      username: null,
      isAuthenticated: false,
      setAuth: (accessToken, username) => 
        set({ accessToken, username, isAuthenticated: true }),
      clearAuth: () => 
        set({ accessToken: null, username: null, isAuthenticated: false }),
    }),
    {
      name: 'twitter-auth',
    }
  )
);