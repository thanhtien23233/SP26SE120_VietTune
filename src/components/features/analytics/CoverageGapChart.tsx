import { AlertCircle, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { analyticsApi } from '@/services/analyticsApi';
import type { CoverageRow } from '@/types/analytics';
import { uiToast } from '@/uiToast';

const LOW_COVERAGE_THRESHOLD = 2;
const CHART_LIMIT = 16;

type NormalizedCoverageRow = {
  key: string;
  label: string;
  ethnicity: string;
  region: string;
  count: number;
};

function normalizeCoverageRows(rows: CoverageRow[]): NormalizedCoverageRow[] {
  return rows
    .map((row, idx) => {
      const rawCount = row.count ?? row.value ?? 0;
      const count = Number.isFinite(rawCount) ? Math.max(0, Number(rawCount)) : 0;
      const ethnicity = (row.ethnicity ?? row.name ?? `Unknown-${idx}`).trim();
      const region = (row.region ?? '').trim();
      const label = (row.label ?? row.name ?? ethnicity).trim();
      return {
        key: `${ethnicity}-${region || 'na'}-${idx}`,
        label: label || ethnicity,
        ethnicity,
        region,
        count,
      };
    })
    .filter((row) => !!row.label)
    .sort((a, b) => b.count - a.count);
}

export interface CoverageGapChartProps {
  className?: string;
}

export default function CoverageGapChart({ className }: CoverageGapChartProps) {
  const [rows, setRows] = useState<NormalizedCoverageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCoverage = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyticsApi.getCoverage();
      setRows(normalizeCoverageRows(result));
    } catch (err) {
      setRows([]);
      setError('Không thể tải dữ liệu độ phủ theo dân tộc.');
      uiToast.fromApiError(err, 'common.http_500');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCoverage();
  }, [loadCoverage]);

  const chartData = useMemo(() => rows.slice(0, CHART_LIMIT), [rows]);
  const gaps = useMemo(
    () => rows.filter((row) => row.count < LOW_COVERAGE_THRESHOLD).slice(0, 24),
    [rows],
  );

  return (
    <section
      className={`rounded-2xl border border-neutral-200/80 p-6 shadow-lg transition-all duration-300 hover:shadow-xl ${className ?? ''} bg-surface-panel`}
      aria-live="polite"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-neutral-900">Độ phủ theo dân tộc</h3>
        <button
          type="button"
          onClick={() => void loadCoverage()}
          disabled={loading}
          className="rounded-lg border border-neutral-200/80 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-60"
        >
          Làm mới
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải dữ liệu analytics...
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {!loading && !error && chartData.length === 0 && (
        <p className="text-sm text-neutral-500">Chưa có dữ liệu độ phủ để hiển thị.</p>
      )}

      {!loading && !error && chartData.length > 0 && (
        <>
          <div className="h-[380px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" tick={{ fill: '#525252', fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={160}
                  tick={{ fill: '#404040', fontSize: 12 }}
                />
                <Tooltip
                  formatter={(value) => [`${Number(value ?? 0)}`, 'Số bản thu']}
                  labelFormatter={(label) => `Dân tộc: ${label}`}
                  contentStyle={{ borderRadius: 12, borderColor: '#E5E7EB' }}
                />
                <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                  {chartData.map((row) => (
                    <Cell
                      key={row.key}
                      fill={row.count < LOW_COVERAGE_THRESHOLD ? '#FB7185' : '#4F46E5'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-5">
            <h4 className="mb-2 text-sm font-semibold text-neutral-800">
              Nhóm cần bổ sung tư liệu ({`< ${LOW_COVERAGE_THRESHOLD}`} bản thu)
            </h4>
            {gaps.length === 0 ? (
              <p className="text-sm text-emerald-700">Không phát hiện khoảng trống đáng kể.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {gaps.map((row) => (
                  <span
                    key={`gap-${row.key}`}
                    className="inline-flex items-center rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-medium text-rose-800"
                    title={row.region ? `Vùng: ${row.region}` : 'Chưa có vùng'}
                  >
                    {row.label} ({row.count})
                  </span>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
