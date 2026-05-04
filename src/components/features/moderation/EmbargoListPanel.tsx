import { AlertCircle, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { embargoApi } from '@/services/embargoApi';
import { EMBARGO_STATUS_LABELS } from '@/types/embargo';
import type { EmbargoDto } from '@/types/embargo';
import { uiToast } from '@/uiToast';

export interface EmbargoListPanelProps {
  className?: string;
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EmbargoListPanel({ className }: EmbargoListPanelProps) {
  const [rows, setRows] = useState<EmbargoDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<number | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await embargoApi.list({
        page,
        pageSize,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setRows(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setError('Không tải được danh sách embargo.');
      uiToast.fromApiError(err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil((total || 0) / pageSize));
  }, [pageSize, total]);

  const handleLift = useCallback(
    async (row: EmbargoDto) => {
      const accepted = window.confirm('Gỡ bỏ embargo cho bản ghi này?');
      if (!accepted) return;
      const recordingId = String(row.recordingId ?? '').trim();
      if (!recordingId) return;
      setBusyId(recordingId);
      try {
        await embargoApi.lift(recordingId, { reason: null });
        // Backend auto-notification: EmbargoLifted → tránh tạo thông báo kép ở FE.
        uiToast.success('Đã gỡ embargo.');
        await load();
      } catch (err) {
        uiToast.fromApiError(err);
      } finally {
        setBusyId(null);
      }
    },
    [load],
  );

  return (
    <section
      className={`rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-5 ${className ?? ''}`}
      aria-label="Embargo list panel"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">Danh sách hạn chế công bố</h3>
          <p className="text-xs text-neutral-600">Theo dõi các bản ghi đang embargo.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Lọc theo trạng thái embargo"
            value={String(statusFilter)}
            onChange={(e) => {
              const v = e.target.value;
              setStatusFilter(v === 'all' ? 'all' : Number(v));
              setPage(1);
            }}
            className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs text-neutral-700"
          >
            <option value="all">Tất cả trạng thái</option>
            {Object.entries(EMBARGO_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Làm mới
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải danh sách embargo...
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
          Chưa có bản ghi nào trong danh sách embargo.
        </div>
      )}

      {!loading && !error && rows.length > 0 && (
        <>
          <div className="overflow-x-auto rounded-lg border border-neutral-200">
            <table className="min-w-full divide-y divide-neutral-200 text-sm">
              <thead className="bg-neutral-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-neutral-700">Bản ghi</th>
                  <th className="px-3 py-2 text-left font-semibold text-neutral-700">Trạng thái</th>
                  <th className="px-3 py-2 text-left font-semibold text-neutral-700">Bắt đầu</th>
                  <th className="px-3 py-2 text-left font-semibold text-neutral-700">Kết thúc</th>
                  <th className="px-3 py-2 text-left font-semibold text-neutral-700">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 bg-white">
                {rows.map((row) => {
                  const status = typeof row.status === 'number' ? row.status : 0;
                  const statusLabel = EMBARGO_STATUS_LABELS[status] ?? `Trạng thái ${status}`;
                  const recordingId = String(row.recordingId ?? '').trim();
                  const canLift = status === 2 || status === 3;
                  const busy = busyId === recordingId;
                  return (
                    <tr key={recordingId || String(Math.random())}>
                      <td className="px-3 py-2 text-neutral-800">{recordingId || '(Không rõ)'}</td>
                      <td className="px-3 py-2">
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700">
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-neutral-700">{formatDateTime(row.embargoStartDate)}</td>
                      <td className="px-3 py-2 text-neutral-700">{formatDateTime(row.embargoEndDate)}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => void handleLift(row)}
                          disabled={!canLift || busy}
                          className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {busy ? 'Đang gỡ...' : 'Gỡ'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-neutral-600">
            <span>
              Trang {page}/{totalPages} · Tổng {total}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 font-semibold text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Trước
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 font-semibold text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Sau
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
