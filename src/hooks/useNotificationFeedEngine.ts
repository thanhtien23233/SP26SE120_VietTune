import { useCallback, useEffect, useRef } from 'react';

import {
  NOTIFICATION_POLL_INTERVAL_MS,
  NOTIFICATION_POLL_SLOW_INTERVAL_MS,
} from '@/config/notificationPollConstants';
import {
  setNotificationHubConnectionHandler,
  subscribeNotificationHub,
} from '@/services/notificationHub';
import { recordingRequestService } from '@/services/recordingRequestService';
import { useNotificationFeedStore } from '@/stores/notificationFeedStore';
import type { UserRole } from '@/types/user';
import { uiToast } from '@/uiToast';

export type UseNotificationFeedEngineOptions = {
  enabled: boolean;
  role: UserRole | undefined;
  showToastOnNew: boolean;
};

export function useNotificationFeedEngine({
  enabled,
  role,
  showToastOnNew,
}: UseNotificationFeedEngineOptions): void {
  const prevIdsRef = useRef<Set<string> | null>(null);
  const prevUnreadRef = useRef<number | null>(null);
  const setActiveRole = useNotificationFeedStore((s) => s.setActiveRole);
  const setNotifications = useNotificationFeedStore((s) => s.setNotifications);
  const setFetchError = useNotificationFeedStore((s) => s.setFetchError);
  const setInitialLoading = useNotificationFeedStore((s) => s.setInitialLoading);
  const setSignalRConnected = useNotificationFeedStore((s) => s.setSignalRConnected);
  const prependNotification = useNotificationFeedStore((s) => s.prependNotification);

  const reloadNotifications = useCallback(async () => {
    if (!role) return;
    try {
      const list = await recordingRequestService.getNotificationsForRole(role);
      setNotifications(list);
      setFetchError(null);

      if (prevIdsRef.current) {
        const newIds = list.map((n) => n.id);
        const addedIds = newIds.filter((id) => !prevIdsRef.current!.has(id));
        const newlyAdded = list.filter((n) => addedIds.includes(n.id));
        if (newlyAdded.length > 0 && showToastOnNew) {
          newlyAdded.forEach((n) => {
            if (!n.read) {
              uiToast.info(n.title + ': ' + n.body);
            }
          });
        }
      }
      prevIdsRef.current = new Set(list.map((n) => n.id));
    } catch (err) {
      console.error('Failed to load notifications', err);
      setNotifications([]);
      setFetchError('Không tải được danh sách thông báo. Bạn có thể thử lại sau.');
    } finally {
      setInitialLoading(false);
    }
  }, [role, setFetchError, setInitialLoading, setNotifications, showToastOnNew]);

  const pollUnreadTick = useCallback(async () => {
    try {
      const { unread } = await recordingRequestService.getUnreadCount();
      if (prevUnreadRef.current == null) {
        prevUnreadRef.current = unread;
        return;
      }
      if (unread !== prevUnreadRef.current) {
        prevUnreadRef.current = unread;
        await reloadNotifications();
      }
    } catch {
      await reloadNotifications();
    }
  }, [reloadNotifications]);

  useEffect(() => {
    useNotificationFeedStore.setState({ reloadNotifications });
    return () => {
      useNotificationFeedStore.setState({
        reloadNotifications: async () => {
          /* no-op */
        },
      });
    };
  }, [reloadNotifications]);

  const signalRConnected = useNotificationFeedStore((s) => s.signalRConnected);
  const pollMs = signalRConnected ? NOTIFICATION_POLL_SLOW_INTERVAL_MS : NOTIFICATION_POLL_INTERVAL_MS;

  useEffect(() => {
    if (!enabled || !role) {
      setActiveRole(undefined);
      setNotifications([]);
      setFetchError(null);
      setInitialLoading(false);
      prevIdsRef.current = null;
      prevUnreadRef.current = null;
      return;
    }

    setActiveRole(role);
    setInitialLoading(true);
    void reloadNotifications();

    const t = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      void pollUnreadTick();
    }, pollMs);
    const onVis = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        void pollUnreadTick();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [
    enabled,
    role,
    pollMs,
    pollUnreadTick,
    reloadNotifications,
    setActiveRole,
    setFetchError,
    setInitialLoading,
    setNotifications,
  ]);

  useEffect(() => {
    if (!enabled || !role) return;

    setNotificationHubConnectionHandler((connected) => {
      setSignalRConnected(connected);
    });

    const unsub = subscribeNotificationHub((n) => {
      prependNotification(n);
      prevIdsRef.current = prevIdsRef.current ?? new Set<string>();
      prevIdsRef.current.add(n.id);
      prevUnreadRef.current = (prevUnreadRef.current ?? 0) + (n.read ? 0 : 1);
      if (showToastOnNew && !n.read) {
        uiToast.info(n.title + ': ' + n.body);
      }
    });

    return () => {
      unsub();
      setNotificationHubConnectionHandler(null);
      setSignalRConnected(false);
    };
  }, [enabled, role, prependNotification, setSignalRConnected, showToastOnNew]);
}
