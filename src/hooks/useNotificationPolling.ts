import { useMemo } from 'react';

import { useNotificationFeedStore } from '@/stores/notificationFeedStore';
import type { AppNotification } from '@/types';
import type { UserRole } from '@/types/user';

export {
  NOTIFICATION_POLL_INTERVAL_MS,
  NOTIFICATION_POLL_SLOW_INTERVAL_MS,
} from '@/config/notificationPollConstants';

export type UseNotificationPollingOptions = {
  enabled: boolean;
  role: UserRole | undefined;
  trackFetchError?: boolean;
};

export type UseNotificationPollingResult = {
  notifications: AppNotification[];
  unreadCount: number;
  reloadNotifications: () => Promise<void>;
  fetchError: string | null;
  isInitialLoading: boolean;
  signalRConnected: boolean;
};

export function useNotificationPolling({
  enabled,
  role,
  trackFetchError = false,
}: UseNotificationPollingOptions): UseNotificationPollingResult {
  const notifications = useNotificationFeedStore((s) =>
    enabled && role ? s.notifications : [],
  );
  const reloadNotifications = useNotificationFeedStore((s) => s.reloadNotifications);
  const fetchErrorFromStore = useNotificationFeedStore((s) => s.fetchError);
  const isInitialLoading = useNotificationFeedStore((s) =>
    enabled && role ? s.isInitialLoading : false,
  );
  const signalRConnected = useNotificationFeedStore((s) =>
    enabled && role ? s.signalRConnected : false,
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  return {
    notifications,
    unreadCount,
    reloadNotifications,
    fetchError: trackFetchError ? fetchErrorFromStore : null,
    isInitialLoading,
    signalRConnected,
  };
}
