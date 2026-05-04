import { create } from 'zustand';

import type { AppNotification } from '@/types';
import type { UserRole } from '@/types/user';

type NotificationFeedState = {
  notifications: AppNotification[];
  fetchError: string | null;
  isInitialLoading: boolean;
  signalRConnected: boolean;
  activeRole: UserRole | undefined;
  reloadNotifications: () => Promise<void>;
  setNotifications: (list: AppNotification[]) => void;
  setFetchError: (msg: string | null) => void;
  setInitialLoading: (v: boolean) => void;
  setSignalRConnected: (v: boolean) => void;
  setActiveRole: (role: UserRole | undefined) => void;
  prependNotification: (n: AppNotification) => void;
  removeNotification: (id: string) => void;
};

export const useNotificationFeedStore = create<NotificationFeedState>((set, get) => ({
  notifications: [],
  fetchError: null,
  isInitialLoading: false,
  signalRConnected: false,
  activeRole: undefined,
  reloadNotifications: async () => {},

  setNotifications: (list) => set({ notifications: list }),
  setFetchError: (msg) => set({ fetchError: msg }),
  setInitialLoading: (v) => set({ isInitialLoading: v }),
  setSignalRConnected: (v) => set({ signalRConnected: v }),
  setActiveRole: (role) => set({ activeRole: role }),

  prependNotification: (n) => {
    const prev = get().notifications;
    if (prev.some((p) => p.id === n.id)) return;
    set({ notifications: [n, ...prev] });
  },

  removeNotification: (id) => {
    const prev = get().notifications;
    set({ notifications: prev.filter((n) => n.id !== id) });
  },
}));
