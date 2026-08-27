import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Staff } from '@/db/types';

interface SessionStore {
  staff: Staff | null;
  shiftId?: string;
  favoritesOnly: boolean;
  recentProductIds: string[];
  pinned: string[];
  login: (s: Staff) => void;
  logout: () => void;
  setShift: (id?: string) => void;
  pushRecent: (id: string) => void;
  togglePin: (path: string) => void;
}

export const useSession = create<SessionStore>()(
  persist(
    (set, get) => ({
      staff: null, favoritesOnly: false, recentProductIds: [], pinned: ['/pos', '/inventory', '/reports'],
      login: (staff) => set({ staff }),
      logout: () => set({ staff: null }),
      setShift: (shiftId) => set({ shiftId }),
      pushRecent: (id) => set({ recentProductIds: [id, ...get().recentProductIds.filter((x) => x !== id)].slice(0, 24) }),
      togglePin: (p) => set({ pinned: get().pinned.includes(p) ? get().pinned.filter((x) => x !== p) : [...get().pinned, p] }),
    }),
    { name: 'swiftpos-session' },
  ),
);
