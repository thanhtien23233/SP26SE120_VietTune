import { ChevronDown, Flag, Loader2, MessageSquare, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import Pagination from '@/components/common/Pagination';
import FlaggedResponseList from '@/components/features/ai/FlaggedResponseList';
import {
  fetchAllMessages,
  flagMessage,
  type QAMessagePagedResult,
  type QAMessageRequest,
} from '@/services/qaMessageService';
import { notifyLine, uiToast } from '@/uiToast';
import { formatDateTime } from '@/utils/helpers';

export interface ModerationAITabProps {
  onOpenRecording?: (recordingId: string) => void;
  currentUserId?: string;
}

function safeParseStringArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string' && x.length > 0) : [];
  } catch {
    return [];
  }
}

export default function ModerationAITab({ onOpenRecording, currentUserId }: ModerationAITabProps) {
  const [expandedAll, setExpandedAll] = useState(false);
  const [loadingAll, setLoadingAll] = useState(false);
  const [allError, setAllError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [paged, setPaged] = useState<QAMessagePagedResult>({ data: [], total: 0, page: 1, pageSize: 20 });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flaggedKey, setFlaggedKey] = useState(0);

  const loadAll = useCallback(async () => {
    setLoadingAll(true);
    setAllError(null);
    try {
      const res = await fetchAllMessages(page, pageSize);
      const assistantOnly = (res.data ?? []).filter((m) => m.role === 1);
      setPaged({
        data: assistantOnly,
        total: res.total,
        page: res.page,
        pageSize: res.pageSize,
      });
    } catch {
      setAllError('Không tải được danh sách phản hồi AI.');
    } finally {
      setLoadingAll(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    if (!expandedAll) return;
    void loadAll();
  }, [expandedAll, loadAll]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((paged.total ?? 0) / pageSize)),
    [paged.total, pageSize],
  );
  const canPaginate = useMemo(() => totalPages > 1, [totalPages]);

  const handleFlag = useCallback(async (item: QAMessageRequest) => {
    setBusyId(item.id);
    try {
      await flagMessage(item.id);
      uiToast.success(notifyLine('Thành công', 'Đã cắm cờ phản hồi AI.'));
      setFlaggedKey((k) => k + 1);
      await loadAll();
    } catch {
      uiToast.error(notifyLine('Lỗi', 'Không cắm cờ được phản hồi AI.'));
    } finally {
      setBusyId(null);
    }
  }, [loadAll]);

  return (
    <div
      id="moderation-panel-ai"
      role="tabpanel"
      aria-labelledby="moderation-tab-ai"
      className="p-6 sm:p-8 min-h-[400px]"
    >
      <h2 className="text-xl font-semibold text-neutral-900 mb-2 flex items-center gap-2">
        <MessageSquare className="h-6 w-6 text-primary-600" strokeWidth={2.5} />
        Giám sát phản hồi AI
      </h2>
      <p className="text-neutral-600 text-sm mb-6 max-w-2xl">
        Dữ liệu lấy trực tiếp từ hệ thống Q&A (API). Chuyên gia có thể cắm cờ, bổ sung bản sửa, và
        gỡ cờ khi đã xử lý.
      </p>

      <div className="space-y-6">
        <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-5">
          <h3 className="text-base font-semibold text-neutral-900 mb-2 flex items-center gap-2">
            <Flag className="h-4 w-4 text-amber-700" />
            Phản hồi AI đã cắm cờ
          </h3>
          <FlaggedResponseList key={flaggedKey} currentUserId={currentUserId} />
        </div>

        <div className="rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-5">
          <button
            type="button"
            onClick={() => setExpandedAll((v) => !v)}
            className="w-full flex items-center justify-between gap-3"
            aria-expanded={expandedAll}
          >
            <div className="text-left">
              <div className="text-base font-semibold text-neutral-900">Tất cả phản hồi AI (Assistant)</div>
              <div className="text-xs text-neutral-600">
                Dùng để cắm cờ các phản hồi mới. Danh sách này chỉ hiển thị message có role=Assistant.
              </div>
            </div>
            <ChevronDown className={`h-5 w-5 text-neutral-600 transition-transform ${expandedAll ? 'rotate-180' : ''}`} />
          </button>

          {expandedAll && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => void loadAll()}
                  disabled={loadingAll}
                  className="inline-flex items-center gap-1 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loadingAll ? 'animate-spin' : ''}`} />
                  Làm mới
                </button>
                <div className="text-xs text-neutral-600">
                  Trang {paged.page} · {paged.data.length} items
                </div>
              </div>

              {loadingAll && (
                <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tải danh sách phản hồi AI...
                </div>
              )}

              {!loadingAll && allError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{allError}</div>
              )}

              {!loadingAll && !allError && paged.data.length === 0 && (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
                  Chưa có phản hồi AI nào trong trang hiện tại.
                </div>
              )}

              {!loadingAll && !allError && paged.data.length > 0 && (
                <ul className="space-y-3">
                  {paged.data.map((item) => {
                    const itemBusy = busyId === item.id;
                    const recordingIds = safeParseStringArray(item.sourceRecordingIdsJson);
                    return (
                      <li key={item.id} className="rounded-xl border border-neutral-200 bg-surface-panel p-3 shadow-sm">
                        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs text-neutral-600">{formatDateTime(item.createdAt)}</span>
                          {item.flaggedByExpert ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                              <Flag className="h-3.5 w-3.5" />
                              Đã cắm cờ
                            </span>
                          ) : null}
                        </div>

                        <p className="whitespace-pre-wrap text-sm text-neutral-800">{item.content || '(Không có nội dung)'}</p>

                        {recordingIds.length > 0 && onOpenRecording && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-xs font-semibold text-sky-800">Nguồn:</span>
                            {recordingIds.slice(0, 6).map((id) => (
                              <button
                                key={id}
                                type="button"
                                onClick={() => onOpenRecording(id)}
                                className="text-xs text-sky-800 hover:text-sky-900 underline underline-offset-2"
                              >
                                {id}
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleFlag(item)}
                            disabled={itemBusy || item.flaggedByExpert === true}
                            className="inline-flex items-center gap-1.5 rounded-md bg-amber-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {itemBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Flag className="h-3.5 w-3.5" />}
                            Cắm cờ
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {expandedAll && canPaginate && (
                <div className="pt-2">
                  <Pagination currentPage={page} totalPages={totalPages} onPageChange={(next) => setPage(next)} />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
