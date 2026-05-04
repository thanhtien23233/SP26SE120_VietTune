import { AlertCircle, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import DisputeEvidenceUpload from './DisputeEvidenceUpload';

import Button from '@/components/common/Button';
import { DISPUTE_RESOLUTION_NOTES_MAX_LENGTH } from '@/config/validationConstants';
import { copyrightDisputeApi } from '@/services/copyrightDisputeApi';
import { COPYRIGHT_DISPUTE_STATUS_LABELS } from '@/types/copyrightDispute';
import type { CopyrightDisputeDto, ResolveDisputeRequest } from '@/types/copyrightDispute';
import { uiToast } from '@/uiToast';
import { isUuid } from '@/utils/validation';

export interface DisputeListPanelProps {
  className?: string;
}

function readDisputeId(row: CopyrightDisputeDto): string {
  const obj = row as unknown as Record<string, unknown>;
  const byDisputeId = obj.disputeId;
  if (typeof byDisputeId === 'string' && byDisputeId.trim()) return byDisputeId;
  const byId = obj.id;
  if (typeof byId === 'string' && byId.trim()) return byId;
  return '';
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

const RESOLUTION_OPTIONS = [
  { value: 'resolved_keep', label: 'Giu lai ban ghi' },
  { value: 'resolved_remove', label: 'Go ban ghi' },
  { value: 'rejected', label: 'Tu choi bao cao' },
];

export default function DisputeListPanel({ className }: DisputeListPanelProps) {
  const [rows, setRows] = useState<CopyrightDisputeDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<number | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<CopyrightDisputeDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reviewerId, setReviewerId] = useState('');
  const [resolution, setResolution] = useState('resolved_keep');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [notifyContributor, setNotifyContributor] = useState(true);
  const [reviewerIdError, setReviewerIdError] = useState<string | null>(null);

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await copyrightDisputeApi.list({
        page,
        pageSize,
        status: statusFilter === 'all' ? undefined : statusFilter,
      });
      setRows(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setError('Không tải được danh sách tranh chấp.');
      uiToast.fromApiError(err);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  const loadDetail = useCallback(async (disputeId: string) => {
    setDetailLoading(true);
    try {
      const detail = await copyrightDisputeApi.getById(disputeId);
      setSelectedDetail(detail);
      setReviewerId(detail?.assignedReviewerId ?? '');
      setResolutionNotes(detail?.resolutionNotes ?? '');
    } catch (err) {
      uiToast.fromApiError(err);
      setSelectedDetail(null);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadList();
  }, [loadList]);

  useEffect(() => {
    if (!selectedDisputeId) {
      setSelectedDetail(null);
      return;
    }
    void loadDetail(selectedDisputeId);
  }, [loadDetail, selectedDisputeId]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil((total || 0) / pageSize)), [pageSize, total]);

  const handleAssign = useCallback(async () => {
    if (!selectedDisputeId) return;
    const reviewer = reviewerId.trim();
    if (!reviewer) {
      setReviewerIdError(null);
      uiToast.warning('Vui lòng nhập reviewerId.');
      return;
    }
    if (!isUuid(reviewer)) {
      setReviewerIdError('Reviewer ID phải là UUID hợp lệ.');
      return;
    }
    setReviewerIdError(null);
    setBusy(true);
    try {
      await copyrightDisputeApi.assign(selectedDisputeId, reviewer);
      uiToast.success('Da gan reviewer.');
      await Promise.all([loadList(), loadDetail(selectedDisputeId)]);
    } catch (err) {
      uiToast.fromApiError(err);
    } finally {
      setBusy(false);
    }
  }, [loadDetail, loadList, reviewerId, selectedDisputeId]);

  const handleResolve = useCallback(async () => {
    if (!selectedDisputeId) return;
    const payload: ResolveDisputeRequest = {
      resolution,
      resolutionNotes:
        resolutionNotes.trim().slice(0, DISPUTE_RESOLUTION_NOTES_MAX_LENGTH) || null,
      notifyContributor,
    };
    setBusy(true);
    try {
      await copyrightDisputeApi.resolve(selectedDisputeId, payload);
      // Backend auto-notification: DisputeResolved → tránh tạo thông báo kép ở FE.
      // `notifyContributor` đã được gửi trong payload để backend quyết định có gửi hay không.
      uiToast.success('Da cap nhat ket qua tranh chap.');
      await Promise.all([loadList(), loadDetail(selectedDisputeId)]);
    } catch (err) {
      uiToast.fromApiError(err);
    } finally {
      setBusy(false);
    }
  }, [
    loadDetail,
    loadList,
    notifyContributor,
    resolution,
    resolutionNotes,
    selectedDisputeId,
  ]);

  return (
    <section
      className={`rounded-2xl border border-neutral-200/80 bg-white p-4 shadow-sm sm:p-5 ${className ?? ''}`}
      aria-label="Copyright dispute list panel"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-neutral-900">Danh sach tranh chap ban quyen</h3>
          <p className="text-xs text-neutral-600">Theo doi va xu ly luong tranh chap.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Loc trang thai tranh chap"
            value={String(statusFilter)}
            onChange={(e) => {
              const v = e.target.value;
              setStatusFilter(v === 'all' ? 'all' : Number(v));
              setPage(1);
            }}
            className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-xs text-neutral-700"
          >
            <option value="all">Tat ca trang thai</option>
            {Object.entries(COPYRIGHT_DISPUTE_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <Button
            type="button"
            onClick={() => void loadList()}
            disabled={loading}
            variant="outline"
            size="sm"
            className="rounded-lg px-2.5 py-1.5 text-xs"
          >
            Lam moi
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          Dang tai danh sach tranh chap...
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div>
            {rows.length === 0 ? (
              <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700">
                Chua co tranh chap ban quyen.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-neutral-200">
                <table className="min-w-full divide-y divide-neutral-200 text-sm">
                  <thead className="bg-neutral-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold text-neutral-700">Recording</th>
                      <th className="px-3 py-2 text-left font-semibold text-neutral-700">Status</th>
                      <th className="px-3 py-2 text-left font-semibold text-neutral-700">Reporter</th>
                      <th className="px-3 py-2 text-left font-semibold text-neutral-700">Assigned</th>
                      <th className="px-3 py-2 text-left font-semibold text-neutral-700">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 bg-white">
                    {rows.map((row) => {
                      const disputeId = readDisputeId(row);
                      const selected = selectedDisputeId === disputeId;
                      const statusLabel = COPYRIGHT_DISPUTE_STATUS_LABELS[row.status] ?? `Status ${row.status}`;
                      return (
                        <tr
                          key={disputeId || `${row.recordingId}-${row.createdAt}`}
                          onClick={() => disputeId && setSelectedDisputeId(disputeId)}
                          className={`cursor-pointer ${selected ? 'bg-primary-50' : 'hover:bg-neutral-50'}`}
                        >
                          <td className="px-3 py-2 text-neutral-800">{row.recordingId}</td>
                          <td className="px-3 py-2">
                            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700">
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-neutral-700">{row.reportedByUserId || '—'}</td>
                          <td className="px-3 py-2 text-neutral-700">{row.assignedReviewerId || '—'}</td>
                          <td className="px-3 py-2 text-neutral-700">{formatDateTime(row.createdAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between text-xs text-neutral-600">
              <span>
                Trang {page}/{totalPages} · Tong {total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-md border border-neutral-300 bg-white px-2.5 py-1 font-semibold text-neutral-700 hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Truoc
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
          </div>

          <div className="rounded-xl border border-neutral-200 bg-surface-panel p-3">
            {!selectedDisputeId && (
              <p className="text-sm text-neutral-700">Chon mot tranh chap de xem chi tiet va xu ly.</p>
            )}
            {selectedDisputeId && detailLoading && (
              <div className="flex items-center gap-2 text-sm text-neutral-700">
                <Loader2 className="h-4 w-4 animate-spin" />
                Dang tai chi tiet...
              </div>
            )}
            {selectedDisputeId && !detailLoading && selectedDetail && (
              <div className="space-y-3">
                <div className="rounded-lg border border-neutral-200 bg-white p-3 text-xs text-neutral-700">
                  <p>
                    <span className="font-semibold">DisputeId:</span> {readDisputeId(selectedDetail) || '—'}
                  </p>
                  <p>
                    <span className="font-semibold">Recording:</span> {selectedDetail.recordingId}
                  </p>
                  <p>
                    <span className="font-semibold">Reporter:</span> {selectedDetail.reportedByUserId || '—'}
                  </p>
                  <p>
                    <span className="font-semibold">Status:</span>{' '}
                    {COPYRIGHT_DISPUTE_STATUS_LABELS[selectedDetail.status] ?? selectedDetail.status}
                  </p>
                  {selectedDetail.description && (
                    <p className="mt-2 whitespace-pre-wrap text-neutral-800">{selectedDetail.description}</p>
                  )}
                </div>

                <div className="rounded-lg border border-neutral-200 bg-white p-3">
                  <label className="mb-1 block text-xs font-semibold text-neutral-700" htmlFor="assign-reviewer-id">
                    Gan reviewer (reviewerId)
                  </label>
                  <input
                    id="assign-reviewer-id"
                    type="text"
                    value={reviewerId}
                    onChange={(e) => {
                      setReviewerIdError(null);
                      setReviewerId(e.target.value);
                    }}
                    aria-invalid={reviewerIdError ? true : undefined}
                    aria-describedby={reviewerIdError ? 'assign-reviewer-id-error' : undefined}
                    className={`mb-2 w-full rounded-md border px-2.5 py-1.5 text-xs text-neutral-800 ${
                      reviewerIdError ? 'border-red-500' : 'border-neutral-300'
                    }`}
                    placeholder="Nhập UUID người xử lý (reviewer)..."
                    autoComplete="off"
                  />
                  {reviewerIdError ? (
                    <p id="assign-reviewer-id-error" className="-mt-1 mb-2 text-xs text-red-700" role="alert">
                      {reviewerIdError}
                    </p>
                  ) : null}
                  <Button
                    type="button"
                    onClick={() => void handleAssign()}
                    disabled={busy}
                    variant="primary"
                    size="sm"
                    className="rounded-md px-2.5 py-1.5 text-xs"
                  >
                    Gan reviewer
                  </Button>
                </div>

                <div className="rounded-lg border border-neutral-200 bg-white p-3">
                  <label className="mb-1 block text-xs font-semibold text-neutral-700" htmlFor="resolve-result">
                    Ket qua xu ly
                  </label>
                  <select
                    id="resolve-result"
                    value={resolution}
                    onChange={(e) => setResolution(e.target.value)}
                    className="mb-2 w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-800"
                  >
                    {RESOLUTION_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    rows={3}
                    maxLength={DISPUTE_RESOLUTION_NOTES_MAX_LENGTH}
                    className="mb-2 w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-xs text-neutral-800"
                    placeholder="Ghi chú xử lý..."
                  />
                  <label className="mb-2 inline-flex items-center gap-2 text-xs text-neutral-700">
                    <input
                      type="checkbox"
                      checked={notifyContributor}
                      onChange={(e) => setNotifyContributor(e.target.checked)}
                    />
                    Thông báo cho người đóng góp
                  </label>
                  <Button
                    type="button"
                    onClick={() => void handleResolve()}
                    disabled={busy}
                    variant="outline"
                    size="sm"
                    className="block rounded-md border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800 hover:bg-amber-100"
                  >
                    Xác nhận kết quả
                  </Button>
                </div>

                <DisputeEvidenceUpload
                  disputeId={selectedDisputeId}
                  onSuccess={() => void loadDetail(selectedDisputeId)}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
