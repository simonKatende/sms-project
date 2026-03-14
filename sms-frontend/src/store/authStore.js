import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Auth store — persisted to sessionStorage so a page refresh keeps the user logged in
 * for the current browser session, but closing the tab clears it.
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      user:            null,   // { id, fullName, username, roleName, mustChangePassword }
      accessToken:     null,
      isAuthenticated: false,

      setAuth: (user, accessToken) => set({ user, accessToken, isAuthenticated: true }),
      setToken: (accessToken)      => set({ accessToken }),
      clearAuth: ()                => set({ user: null, accessToken: null, isAuthenticated: false }),
    }),
    {
      name:    'sms-auth',
      storage: {
        getItem:    (k) => sessionStorage.getItem(k),
        setItem:    (k, v) => sessionStorage.setItem(k, v),
        removeItem: (k) => sessionStorage.removeItem(k),
      },
    },
  ),
);
