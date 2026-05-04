import { Bell } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import BackButton from '@/components/common/BackButton';
import Button from '@/components/common/Button';
import { NotificationTypeIcon } from '@/components/common/NotificationTypeIcon';
import { useNotificationPolling } from '@/hooks/useNotificationPolling';
import { recordingRequestService } from '@/services/recordingRequestService';
import { useAuthStore } from '@/stores/authStore';
import { useNotificationFeedStore } from '@/stores/notificationFeedStore';
import type { AppNotification } from '@/types';
import { notifyLine, uiToast } from '@/uiToast';
import { formatDateTime, formatRelativeTimeVi } from '@/utils/helpers';
import { getNotificationTargetPath } from '@/utils/notificationRoutes';

const PAGE_SIZE = 10;

export default function NotificationPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const { notifications, unreadCount, fetchError, reloadNotifications, isInitialLoading } =
    useNotificationPolling({
      enabled: !!user?.role,
      role: user?.role,
      trackFetchError: true,
    });

  const filtered = useMemo(() => {
    if (filter === 'unread') return notifications.filter((n) => !n.read);
    return notifications;
  }, [notifications, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [filter]);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages, filtered.length]);

  const paginated = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, page]);

  const handleMarkRead = async (id: string) => {
    try {
      await recordingRequestService.markNotificationRead(id);
      await reloadNotifications();
    } catch (err) {
      console.error(err);
      uiToast.error(notifyLine('Lỗi', 'Không thể cập nhật trạng thái đã đọc.'));
    }
  };

  const removeFromFeed = useNotificationFeedStore((s) => s.removeNotification);
  const handleDeleteNotification = async (id: string) => {
    removeFromFeed(id);
    try {
      await recordingRequestService.deleteNotification(id);
    } catch (err) {
      console.error(err);
      uiToast.error(notifyLine('Lỗi', 'Không thể xóa thông báo. Vui lòng thử lại.'));
      await reloadNotifications();
    }
  };

  const handleOpenNotification = async (n: AppNotification) => {
    if (!n.read) {
      try {
        await recordingRequestService.markNotificationRead(n.id);
        await reloadNotifications();
      } catch (err) {
        console.error(err);
        uiToast.error(notifyLine('Lỗi', 'Không thể cập nhật trạng thái đã đọc.'));
        return;
      }
    }
    navigate(getNotificationTargetPath(n));
  };

  const hasUnread = unreadCount > 0;
  const handleMarkAllRead = async () => {
    if (!user?.role) return;
    try {
      await recordingRequestService.markAllNotificationsReadForRole(user.role);
      await reloadNotifications();
    } catch (err) {
      console.error(err);
      uiToast.error(notifyLine('Lỗi', 'Không thể đánh dấu đã đọc tất cả.'));
    }
  };

  const showSkeleton = isInitialLoading && notifications.length === 0 && !fetchError;
  const showEmptyAll = !isInitialLoading && notifications.length === 0 && !fetchError;
  const showEmptyUnread =
    !isInitialLoading &&
    !fetchError &&
    notifications.length > 0 &&
    filtered.length === 0 &&
    filter === 'unread';

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-3xl font-bold text-neutral-800 min-w-0">Thông báo</h1>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <Button
              type="button"
              onClick={handleMarkAllRead}
              disabled={!hasUnread}
              title={
                hasUnread ? 'Đánh dấu tất cả thông báo là đã đọc' : 'Không còn thông báo chưa đọc'
              }
              className="min-h-[44px] px-4 sm:px-6 py-2 rounded-xl text-sm sm:text-base"
            >
              Đánh dấu đã đọc tất cả
            </Button>
            <BackButton />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`min-h-[40px] rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            Tất cả
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`min-h-[40px] rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            Chưa đọc
            {unreadCount > 0 ? (
              <span className="ml-1.5 tabular-nums opacity-90">({unreadCount > 99 ? '99+' : unreadCount})</span>
            ) : null}
          </button>
        </div>

        <div className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 transition-all duration-300 bg-surface-panel">
          {fetchError && (
            <div
              className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
              role="alert"
            >
              {fetchError}
            </div>
          )}

          {showSkeleton && (
            <ul className="space-y-4" aria-busy="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <li key={i} className="list-none rounded-2xl border border-neutral-200/80 p-6 animate-pulse">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 shrink-0 rounded-lg bg-neutral-200" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-5 w-2/3 rounded bg-neutral-200" />
                      <div className="h-4 w-full rounded bg-neutral-100" />
                      <div className="h-3 w-24 rounded bg-neutral-100" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {showEmptyAll && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 bg-primary-100/90 rounded-2xl w-fit mb-4 shadow-sm">
                <Bell className="h-10 w-10 text-primary-600" strokeWidth={2.5} />
              </div>
              <h2 className="text-xl font-semibold text-neutral-900 mb-2">Chưa có thông báo</h2>
              <p className="text-neutral-600 max-w-md">
                Các thông báo về kiểm duyệt, xóa bản thu, chỉnh sửa và cập nhật hệ thống sẽ hiển thị
                tại đây.
              </p>
            </div>
          )}

          {showEmptyUnread && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <p className="text-neutral-600">Không có thông báo chưa đọc.</p>
            </div>
          )}

          {!showSkeleton && filtered.length > 0 && (
            <>
              <ul className="space-y-4">
                {paginated.map((n) => (
                  <li
                    key={n.id}
                    className={`list-none transition-opacity duration-300 animate-noti-fade-in ${
                      n.read ? 'opacity-90' : 'opacity-100'
                    }`}
                  >
                    <div className="flex items-stretch justify-between gap-3 sm:gap-4">
                      <button
                        type="button"
                        onClick={() => void handleOpenNotification(n)}
                        className={`min-w-0 flex-1 rounded-2xl border border-neutral-200/80 p-6 text-left transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
                          n.read ? 'bg-neutral-50/80' : 'bg-surface-panel'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <NotificationTypeIcon type={n.type} />
                          <h3 className="font-semibold text-neutral-900">{n.title}</h3>
                          {!n.read && (
                            <span
                              className="inline-block w-2 h-2 rounded-full bg-primary-500 flex-shrink-0"
                              title="Chưa đọc"
                            />
                          )}
                        </div>
                        <p className="text-neutral-700 font-medium text-sm">{n.body}</p>
                        <p
                          className="text-neutral-500 text-xs mt-2"
                          title={formatDateTime(n.createdAt)}
                        >
                          {formatRelativeTimeVi(n.createdAt)}
                        </p>
                      </button>
                      <div className="flex flex-shrink-0 items-start pt-6 gap-2">
                        {!n.read && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleMarkRead(n.id);
                            }}
                            title="Chỉ đánh dấu đã đọc, không mở trang liên quan"
                            className="px-3 py-1.5 rounded-xl text-sm font-medium bg-primary-600 text-white hover:bg-primary-500 transition-colors cursor-pointer shadow-sm"
                          >
                            Đánh dấu đã đọc
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDeleteNotification(n.id);
                          }}
                          title="Xóa thông báo"
                          className="px-3 py-1.5 rounded-xl text-sm font-medium bg-white border border-neutral-300 text-neutral-800 hover:bg-neutral-50 transition-colors cursor-pointer shadow-sm"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              {totalPages > 1 && (
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3 border-t border-neutral-200/80 pt-6">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="min-h-[44px] rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Trang trước
                  </button>
                  <span className="text-sm text-neutral-600 tabular-nums">
                    Trang {page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    className="min-h-[44px] rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-800 shadow-sm transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Trang sau
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
