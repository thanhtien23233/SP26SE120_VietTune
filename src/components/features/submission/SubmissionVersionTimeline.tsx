import { format, parseISO } from 'date-fns';
import { ChevronRight, Clock, Loader2, RefreshCcw, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import Button from '@/components/common/Button';
import { submissionVersionApi } from '@/services/submissionVersionApi';
import { parseChangesJson } from '@/types/submissionVersion';
import type { SubmissionVersionChange, SubmissionVersionDto } from '@/types/submissionVersion';
import { uiToast } from '@/uiToast';

const PAGE_SIZE = 10;

function formatWhen(raw?: string | null): string {
  if (!raw) return '—';
  try {
    return format(parseISO(raw), 'dd/MM/yyyy HH:mm');
  } catch {
    return raw;
  }
}

function renderCell(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export interface SubmissionVersionTimelineProps {
  submissionId: string;
  canDelete?: boolean;
  className?: string;
}

export default function SubmissionVersionTimeline({
  submissionId,
  canDelete = false,
  className,
}: SubmissionVersionTimelineProps) {
  const [rows, setRows] = useState<SubmissionVersionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<SubmissionVersionDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const hasMore = useMemo(() => page * PAGE_SIZE < total, [page, total]);

  const loadList = useCallback(async () => {
    if (!submissionId) {
      setRows([]);
      setSelected(null);
      setTotal(0);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await submissionVersionApi.listBySubmission(submissionId, {
        page,
        pageSize: PAGE_SIZE,
      });
      setRows(res.items);
      setTotal(res.total);
      if (res.items.length === 0 && page > 1) {
        setPage(1);
      }
    } catch (err) {
      setError('Không tải được lịch sử phiên bản của đóng góp.');
      setRows([]);
      setTotal(0);
      uiToast.fromApiError(err, 'common.http_500');
    } finally {
      setLoading(false);
    }
  }, [page, submissionId]);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  const openDetail = useCallback(async (item: SubmissionVersionDto) => {
    setDetailLoading(true);
    setSelected(item);
    try {
      const id = String(item.id ?? '').trim();
      const full = id ? await submissionVersionApi.getById(id) : null;
      if (full) setSelected(full);
    } catch {
      setSelected(item);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!canDelete) return;
      const confirmed = window.confirm('Bạn có chắc muốn xóa phiên bản này?');
      if (!confirmed) return;
      setDeletingId(id);
      try {
        await submissionVersionApi.remove(id);
        uiToast.success('Đã xóa phiên bản.');
        if (selected?.id === id) setSelected(null);
        await loadList();
      } catch (err) {
        uiToast.fromApiError(err, 'common.http_500');
      } finally {
        setDeletingId(null);
      }
    },
    [canDelete, loadList, selected?.id],
  );

  const selectedChanges = useMemo(() => parseChangesJson(selected?.changesJson), [selected?.changesJson]);
  const selectedFields = useMemo(
    () =>
      Array.isArray(selectedChanges?.fields)
        ? (selectedChanges.fields.filter(Boolean) as SubmissionVersionChange[])
        : [],
    [selectedChanges],
  );

  if (!submissionId) {
    return (
      <p className="rounded-xl border border-dashed border-secondary-200/80 bg-cream-50/80 px-3 py-2 text-sm text-neutral-500">
        Chưa có submission để hiển thị lịch sử phiên bản.
      </p>
    );
  }

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-neutral-800">Lịch sử phiên bản đóng góp</h3>
        <Button type="button" variant="ghost" size="sm" onClick={() => void loadList()} disabled={loading}>
          <RefreshCcw className="mr-1 h-3.5 w-3.5" />
          Làm mới
        </Button>
      </div>

      {error && <p className="mb-2 text-xs text-primary-600">{error}</p>}
      {loading && (
        <p className="flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải…
        </p>
      )}
      {!loading && rows.length === 0 && !error && (
        <p className="text-sm text-neutral-500">Chưa có bản ghi lịch sử.</p>
      )}

      {!loading && rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((row) => {
            const note = parseChangesJson(row.changesJson)?.note;
            const id = String(row.id ?? '').trim();
            return (
              <li key={id || `${row.versionNumber ?? 'v'}-${row.createdAt ?? ''}`}>
                <div className="flex items-center gap-2 rounded-xl border border-secondary-200/70 bg-surface-panel px-3 py-2 shadow-sm">
                  <button
                    type="button"
                    onClick={() => void openDetail(row)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left text-sm"
                  >
                    <Clock className="h-4 w-4 shrink-0 text-secondary-600" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-neutral-800">
                        v{row.versionNumber} · {formatWhen(row.createdAt)}
                      </span>
                      {note && <span className="block truncate text-xs text-neutral-500">{note}</span>}
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-neutral-400" />
                  </button>

                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => void handleDelete(id)}
                      disabled={!id || deletingId === id}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                      aria-label={`Xóa version ${row.versionNumber}`}
                      title="Xóa phiên bản"
                    >
                      {deletingId === id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!loading && !error && (rows.length > 0 || page > 1) && (
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-secondary-200/80 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 disabled:opacity-50"
          >
            Trang trước
          </button>
          <span className="text-xs text-neutral-500">Trang {page}</span>
          <button
            type="button"
            disabled={!hasMore}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-secondary-200/80 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 disabled:opacity-50"
          >
            Trang sau
          </button>
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="submission-version-title"
        >
          <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-secondary-200/80 bg-surface-panel shadow-xl">
            <div className="flex items-center justify-between border-b border-secondary-200/70 px-4 py-3">
              <h4 id="submission-version-title" className="text-sm font-semibold text-neutral-900">
                Chi tiết phiên bản v{selected.versionNumber}
              </h4>
              <button
                type="button"
                className="rounded-full p-2 text-neutral-500 hover:bg-neutral-200/60"
                onClick={() => setSelected(null)}
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-4 py-3 text-sm text-neutral-800">
              {detailLoading && (
                <p className="flex items-center gap-2 text-neutral-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tải chi tiết…
                </p>
              )}

              {!detailLoading && (
                <>
                  <p className="mb-3 text-xs text-neutral-500">
                    {formatWhen(selected.createdAt)}
                    {selectedChanges?.note ? ` · ${selectedChanges.note}` : ''}
                  </p>

                  {selectedFields.length > 0 ? (
                    <div className="overflow-x-auto rounded-xl border border-secondary-100 bg-white">
                      <table className="min-w-full text-sm">
                        <thead>
                          <tr className="border-b border-secondary-100 bg-secondary-50/50 text-left">
                            <th className="px-3 py-2 font-semibold text-neutral-700">Trường</th>
                            <th className="px-3 py-2 font-semibold text-neutral-700">Trước</th>
                            <th className="px-3 py-2 font-semibold text-neutral-700">Sau</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedFields.map((field, idx) => (
                            <tr key={`${field.field}-${idx}`} className="border-b border-secondary-50 last:border-b-0">
                              <td className="px-3 py-2 align-top text-neutral-800">{field.field || '—'}</td>
                              <td className="px-3 py-2 align-top text-neutral-600">
                                {renderCell(field.before)}
                              </td>
                              <td className="px-3 py-2 align-top text-neutral-900">{renderCell(field.after)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap break-words rounded-xl border border-secondary-100 bg-white p-3 text-xs text-neutral-700">
                      {selected.changesJson || '(Không có nội dung thay đổi)'}
                    </pre>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
