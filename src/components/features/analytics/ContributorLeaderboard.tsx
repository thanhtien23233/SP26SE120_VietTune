import { AlertCircle, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { analyticsApi } from '@/services/analyticsApi';
import type { ContributorRow } from '@/types/analytics';
import { uiToast } from '@/uiToast';

const DEFAULT_LIMIT = 20;

type NormalizedContributor = {
  id: string;
  name: string;
  username: string;
  contributionCount: number;
  approvedCount: number;
  rejectedCount: number;
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function normalizeContributors(rows: ContributorRow[]): NormalizedContributor[] {
  return rows
    .map((row, idx) => {
      const id = String(row.userId ?? row.id ?? `unknown-${idx}`);
      const username = String(row.username ?? '').trim();
      const fullName = String(row.fullName ?? '').trim();
      return {
        id,
        name: fullName || username || `Người đóng góp #${idx + 1}`,
        username: username || '—',
        contributionCount: toNumber(row.contributionCount ?? row.submissions),
        approvedCount: toNumber(row.approvedCount),
        rejectedCount: toNumber(row.rejectedCount),
      };
    })
    .sort((a, b) => b.contributionCount - a.contributionCount);
}

export interface ContributorLeaderboardProps {
  className?: string;
}

export default function ContributorLeaderboard({ className }: ContributorLeaderboardProps) {
  const [rows, setRows] = useState<NormalizedContributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const loadContributors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyticsApi.getContributors();
      setRows(normalizeContributors(result));
    } catch (err) {
      setRows([]);
      setError('Không thể tải bảng xếp hạng người đóng góp.');
      uiToast.fromApiError(err, 'common.http_500');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContributors();
  }, [loadContributors]);

  const visibleRows = useMemo(
    () => (showAll ? rows : rows.slice(0, DEFAULT_LIMIT)),
    [rows, showAll],
  );

  return (
    <section
      className={`rounded-2xl border border-neutral-200/80 p-6 shadow-lg transition-all duration-300 hover:shadow-xl ${className ?? ''} bg-surface-panel`}
      aria-live="polite"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-neutral-900">Bảng xếp hạng người đóng góp</h3>
        <div className="flex items-center gap-2">
          {rows.length > DEFAULT_LIMIT && (
            <button
              type="button"
              onClick={() => setShowAll((prev) => !prev)}
              className="rounded-lg border border-neutral-200/80 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50"
            >
              {showAll ? 'Thu gọn' : 'Xem tất cả'}
            </button>
          )}
          <button
            type="button"
            onClick={() => void loadContributors()}
            disabled={loading}
            className="rounded-lg border border-neutral-200/80 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-60"
          >
            Làm mới
          </button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải bảng xếp hạng...
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <p className="text-sm text-neutral-500">Chưa có dữ liệu người đóng góp.</p>
      )}

      {!loading && !error && rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-neutral-200/80 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-neutral-50">
              <tr className="text-left text-neutral-700">
                <th className="px-3 py-2 font-semibold">#</th>
                <th className="px-3 py-2 font-semibold">Tên</th>
                <th className="px-3 py-2 font-semibold">Username</th>
                <th className="px-3 py-2 font-semibold">Đóng góp</th>
                <th className="px-3 py-2 font-semibold">Đã duyệt</th>
                <th className="px-3 py-2 font-semibold">Từ chối</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row, index) => (
                <tr key={row.id} className="border-t border-neutral-100 text-neutral-800">
                  <td className="px-3 py-2 font-semibold text-primary-700">{index + 1}</td>
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2 text-neutral-600">{row.username}</td>
                  <td className="px-3 py-2">{row.contributionCount}</td>
                  <td className="px-3 py-2">{row.approvedCount}</td>
                  <td className="px-3 py-2">{row.rejectedCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
