/**
 * schoolStore — persists institution profile data for the current browser session.
 *
 * Used by AppShell to display the school logo and name without an extra API
 * fetch on every page load. Populated/refreshed by the Institution Profile tab.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSchoolStore = create(
  persist(
    (set) => ({
      schoolName: 'Highfield Primary School',
      logoUrl:    null,

      setProfile: ({ schoolName, logoUrl }) =>
        set({ schoolName: schoolName ?? 'Highfield Primary School', logoUrl: logoUrl ?? null }),
    }),
    {
      name: 'sms-school',
      storage: {
        getItem:    (k) => sessionStorage.getItem(k),
        setItem:    (k, v) => sessionStorage.setItem(k, v),
        removeItem: (k) => sessionStorage.removeItem(k),
      },
    },
  ),
);
