import { useVirtualizer } from '@tanstack/react-virtual';
import { AlertCircle, CheckCircle2, Flag, FlagOff, Loader2, PencilLine, RefreshCw, Save, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Button from '@/components/common/Button';
import { AI_EXPERT_CORRECTION_MAX_LENGTH } from '@/config/validationConstants';
import {
  fetchAllMessages,
  type QAMessageRequest,
  unflagMessage,
  updateMessage,
} from '@/services/qaMessageService';
import { notifyLine, uiToast } from '@/uiToast';
import { toastApiError } from '@/uiToast/toastApiError';

export interface FlaggedResponseListProps {
  className?: string;
  onFlaggedCountChange?: (count: number) => void;
  currentUserId?: string;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function roleLabel(role: number): string {
  if (role === 0) return 'User';
  if (role === 1) return 'Assistant';
  return `Role ${role}`;
}

export default function FlaggedResponseList({
  className,
  onFlaggedCountChange,
  currentUserId,
}: FlaggedResponseListProps) {
  const [messages, setMessages] = useState<QAMessageRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftCorrection, setDraftCorrection] = useState('');

  const scrollParentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => scrollParentRef.current,
    estimateSize: () => 200,
    overscan: 8,
    gap: 12,
    getItemKey: (index) => messages[index]?.id ?? index,
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAllMessages(1, 500);
      const flagged = (res.data ?? [])
        .filter((row) => row.flaggedByExpert === true)
        .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
      setMessages(flagged);
      onFlaggedCountChange?.(flagged.length);
    } catch (err) {
      setError('Không tải được danh sách cảnh báo AI.');
      toastApiError(err, 'Không tải được danh sách cảnh báo AI.');
      onFlaggedCountChange?.(0);
    } finally {
      setLoading(false);
    }
  }, [onFlaggedCountChange]);

  useEffect(() => {
    void load();
  }, [load]);

  const hasData = useMemo(() => messages.length > 0, [messages]);

  const startEditCorrection = useCallback((item: QAMessageRequest) => {
    setEditingId(item.id);
    setDraftCorrection(item.expertCorrection ?? '');
  }, []);

  const cancelEditCorrection = useCallback(() => {
    setEditingId(null);
    setDraftCorrection('');
  }, []);

  const handleUnflag = useCallback(
    async (item: QAMessageRequest) => {
      const accepted = window.confirm('Bỏ gắn cờ phản hồi AI này?');
      if (!accepted) return;

      setBusyId(item.id);
      try {
        await unflagMessage(item.id);
        uiToast.success(notifyLine('Thành công', 'Đã bỏ gắn cờ phản hồi AI.'));
        if (editingId === item.id) cancelEditCorrection();
        await load();
      } catch (err) {
        toastApiError(err, 'Không bỏ gắn cờ được phản hồi AI.');
      } finally {
        setBusyId(null);
      }
    },
    [cancelEditCorrection, editingId, load],
  );

  const handleSaveCorrection = useCallback(
    async (item: QAMessageRequest) => {
      const correction = draftCorrection.trim();
      if (!correction) {
        uiToast.warning(notifyLine('Thiếu thông tin', 'Vui lòng nhập nội dung bản sửa.'));
        return;
      }

      setBusyId(item.id);
      try {
        await updateMessage(item.id, {
          ...item,
          expertCorrection: correction,
          correctedByExpertId: currentUserId ?? item.correctedByExpertId ?? null,
        });
        uiToast.success(notifyLine('Thành công', 'Đã lưu bản sửa chuyên gia.'));
        cancelEditCorrection();
        await load();
      } catch (err) {
        toastApiError(err, 'Không lưu được bản sửa chuyên gia.');
      } finally {
        setBusyId(null);
      }
    },
    [cancelEditCorrection, currentUserId, draftCorrection, load],
  );

  return (
    <section
      className={`rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-5 ${className ?? ''}`}
      aria-label="Flagged AI responses"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">Danh sach phan hoi AI bi cam co</h3>
          <p className="text-xs text-neutral-600">
            Quan tri vien co the ra soat, bo cam co, va luu ban sua cho cac phan hoi can canh bao.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          variant="outline"
          size="sm"
          className="inline-flex items-center gap-1 rounded-lg text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Lam moi
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Dang tai danh sach canh bao...
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {!loading && !error && !hasData && (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
          Chua co phan hoi AI nao dang bi cam co.
        </div>
      )}

      {!loading && !error && hasData && (
        <div
          ref={scrollParentRef}
          className="max-h-[min(70vh,36rem)] min-h-[8rem] overflow-auto pr-0.5 [scrollbar-gutter:stable]"
          role="list"
        >
          <div
            className="relative w-full"
            style={{ height: rowVirtualizer.getTotalSize() }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = messages[virtualRow.index];
              if (!item) return null;
              const itemBusy = busyId === item.id;
              const isEditing = editingId === item.id;
              const hasCorrection = Boolean((item.expertCorrection ?? '').trim());

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  className="absolute left-0 top-0 w-full"
                  style={{ transform: `translateY(${virtualRow.start}px)` }}
                >
                  <div className="rounded-xl border border-neutral-200 bg-surface-panel p-3 shadow-sm">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          <Flag className="h-3.5 w-3.5" />
                          Flagged
                        </span>
                        <span className="text-xs text-neutral-600">{formatDateTime(item.createdAt)}</span>
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700">
                          {roleLabel(item.role)}
                        </span>
                      </div>
                      {typeof item.confidenceScore === 'number' && Number.isFinite(item.confidenceScore) && (
                        <span className="text-xs text-neutral-600">
                          Confidence: {item.confidenceScore.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <p className="whitespace-pre-wrap text-sm text-neutral-800">{item.content || '(Không có nội dung)'}</p>

                    {hasCorrection && (
                      <div className="mt-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-800">
                        <div className="mb-1 inline-flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Bản sửa chuyên gia
                        </div>
                        <p className="whitespace-pre-wrap">{item.expertCorrection}</p>
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        onClick={() => startEditCorrection(item)}
                        disabled={itemBusy}
                        variant="outline"
                        size="sm"
                        className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs"
                      >
                        <PencilLine className="h-3.5 w-3.5" />
                        {hasCorrection ? 'Sửa bản sửa' : 'Thêm bản sửa'}
                      </Button>

                      <Button
                        type="button"
                        onClick={() => void handleUnflag(item)}
                        disabled={itemBusy}
                        variant="outline"
                        size="sm"
                        className="inline-flex items-center gap-1 rounded-md border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 hover:bg-amber-100"
                      >
                        {itemBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FlagOff className="h-3.5 w-3.5" />}
                        Bỏ gắn cờ
                      </Button>
                    </div>

                    {isEditing && (
                      <div className="mt-3 rounded-lg border border-neutral-200 bg-white p-3">
                        <label className="mb-1 block text-xs font-medium text-neutral-700" htmlFor={`correction-${item.id}`}>
                          Bản sửa chuyên gia
                        </label>
                        <textarea
                          id={`correction-${item.id}`}
                          value={draftCorrection}
                          onChange={(e) => setDraftCorrection(e.target.value)}
                          rows={3}
                          maxLength={AI_EXPERT_CORRECTION_MAX_LENGTH}
                          className="w-full rounded-md border border-neutral-300 px-2.5 py-2 text-sm text-neutral-800 outline-none ring-primary-500 placeholder:text-neutral-400 focus:ring-2"
                          placeholder="Nhập nội dung bản sửa chuyên gia..."
                        />
                        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[11px] text-neutral-500">
                            {draftCorrection.length}/{AI_EXPERT_CORRECTION_MAX_LENGTH}
                          </span>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              onClick={cancelEditCorrection}
                              variant="outline"
                              size="sm"
                              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs"
                            >
                              <X className="h-3.5 w-3.5" />
                              Hủy
                            </Button>
                            <Button
                              type="button"
                              onClick={() => void handleSaveCorrection(item)}
                              disabled={itemBusy}
                              variant="primary"
                              size="sm"
                              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs"
                            >
                              {itemBusy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Save className="h-3.5 w-3.5" />
                              )}
                              Lưu bản sửa
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
