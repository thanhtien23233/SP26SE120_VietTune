import { AlertCircle, Loader2, Lock, Unlock } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { EMBARGO_REASON_MAX_LENGTH } from '@/config/validationConstants';
import { embargoApi } from '@/services/embargoApi';
import type { EmbargoCreateUpdateDto, EmbargoDto } from '@/types/embargo';
import { EMBARGO_STATUS_LABELS } from '@/types/embargo';
import { uiToast } from '@/uiToast';

export interface EmbargoSectionProps {
  recordingId: string;
  canEdit: boolean;
  className?: string;
}

function toInputDateTime(value?: string | null): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toIsoOrNull(value: string): string | null {
  const text = value.trim();
  if (!text) return null;
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
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

export default function EmbargoSection({ recordingId, canEdit, className }: EmbargoSectionProps) {
  const [embargo, setEmbargo] = useState<EmbargoDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const [reason, setReason] = useState('');
  const [dateRangeError, setDateRangeError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const row = await embargoApi.getByRecordingId(recordingId);
      setEmbargo(row);
      setStartInput(toInputDateTime(row?.embargoStartDate));
      setEndInput(toInputDateTime(row?.embargoEndDate));
      setReason((row?.reason ?? '').trim());
    } catch (err) {
      setError('Không tải được thông tin hạn chế công bố.');
      uiToast.fromApiError(err);
    } finally {
      setLoading(false);
    }
  }, [recordingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const statusLabel = useMemo(() => {
    const status = embargo?.status;
    if (typeof status !== 'number') return 'Chưa có';
    return EMBARGO_STATUS_LABELS[status] ?? `Trạng thái ${status}`;
  }, [embargo?.status]);

  const canLift = embargo?.status === 2 || embargo?.status === 3;

  const handleSave = useCallback(async () => {
    const startIso = toIsoOrNull(startInput);
    const endIso = toIsoOrNull(endInput);
    if (startIso && endIso) {
      const t0 = new Date(startIso).getTime();
      const t1 = new Date(endIso).getTime();
      if (t1 < t0) {
        setDateRangeError('Thời điểm kết thúc phải sau hoặc bằng thời điểm bắt đầu.');
        return;
      }
    }
    setDateRangeError(null);

    const payload: EmbargoCreateUpdateDto = {
      embargoStartDate: startIso,
      embargoEndDate: endIso,
      reason: reason.trim() || null,
    };
    if (!payload.embargoStartDate && !payload.embargoEndDate && !payload.reason) {
      uiToast.warning('Vui lòng nhập ít nhất một trường embargo.');
      return;
    }
    setBusy(true);
    try {
      await embargoApi.createOrUpdate(recordingId, payload);
      uiToast.success('Đã cập nhật hạn chế công bố.');
      await load();
    } catch (err) {
      uiToast.fromApiError(err);
    } finally {
      setBusy(false);
    }
  }, [endInput, load, reason, recordingId, startInput]);

  const handleLift = useCallback(async () => {
    const accepted = window.confirm('Gỡ bỏ hạn chế công bố cho bản ghi này?');
    if (!accepted) return;
    setBusy(true);
    try {
      await embargoApi.lift(recordingId, { reason: reason.trim() || null });
      uiToast.success('Đã gỡ bỏ hạn chế công bố.');
      await load();
    } catch (err) {
      uiToast.fromApiError(err);
    } finally {
      setBusy(false);
    }
  }, [load, reason, recordingId]);

  return (
    <section
      className={`rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-5 ${className ?? ''}`}
      aria-label="Embargo section"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">Hạn chế công bố</h3>
          <p className="text-xs text-neutral-600">
            Quản lý thời gian hạn chế công bố với bản ghi nhạy cảm.
          </p>
        </div>
        <span className="rounded-full border border-neutral-300 bg-neutral-50 px-2.5 py-0.5 text-xs font-semibold text-neutral-700">
          {statusLabel}
        </span>
      </div>

      {loading && (
        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải thông tin embargo...
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium text-neutral-600">Bắt đầu</p>
              <p className="text-sm text-neutral-800">{formatDateTime(embargo?.embargoStartDate)}</p>
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-neutral-600">Kết thúc</p>
              <p className="text-sm text-neutral-800">{formatDateTime(embargo?.embargoEndDate)}</p>
            </div>
          </div>

          {embargo?.reason && (
            <div className="rounded-lg border border-neutral-200 bg-surface-panel p-3 text-sm text-neutral-800">
              <p className="mb-1 text-xs font-semibold text-neutral-600">Lý do</p>
              <p className="whitespace-pre-wrap">{embargo.reason}</p>
            </div>
          )}

          {canEdit && (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-700" htmlFor="embargo-start">
                    Bắt đầu embargo
                  </label>
                  <input
                    id="embargo-start"
                    type="datetime-local"
                    value={startInput}
                    onChange={(e) => {
                      setDateRangeError(null);
                      setStartInput(e.target.value);
                    }}
                    className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-700" htmlFor="embargo-end">
                    Kết thúc embargo
                  </label>
                  <input
                    id="embargo-end"
                    type="datetime-local"
                    value={endInput}
                    onChange={(e) => {
                      setDateRangeError(null);
                      setEndInput(e.target.value);
                    }}
                    aria-invalid={dateRangeError ? true : undefined}
                    aria-describedby={dateRangeError ? 'embargo-date-range-error' : undefined}
                    className={`w-full rounded-lg border bg-white px-3 py-2 text-sm text-neutral-800 ${
                      dateRangeError ? 'border-red-500' : 'border-neutral-300'
                    }`}
                  />
                </div>
              </div>
              {dateRangeError ? (
                <p id="embargo-date-range-error" className="mt-2 text-xs text-red-700" role="alert">
                  {dateRangeError}
                </p>
              ) : null}
              <div className="mt-3">
                <label className="mb-1 block text-xs font-semibold text-neutral-700" htmlFor="embargo-reason">
                  Lý do
                </label>
                <textarea
                  id="embargo-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                  maxLength={EMBARGO_REASON_MAX_LENGTH}
                  placeholder="Mô tả lý do hạn chế công bố..."
                  className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-800"
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={busy}
                  className="inline-flex items-center gap-1 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
                  Lưu embargo
                </button>
                <button
                  type="button"
                  onClick={() => void load()}
                  disabled={busy}
                  className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Tải lại
                </button>
                <button
                  type="button"
                  onClick={() => void handleLift()}
                  disabled={busy || !canLift}
                  className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Unlock className="h-3.5 w-3.5" />
                  Gỡ embargo
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
