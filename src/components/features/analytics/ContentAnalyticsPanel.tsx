import { AlertCircle, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { analyticsApi } from '@/services/analyticsApi';
import type { ContentAnalyticsDto } from '@/types/analytics';
import { uiToast } from '@/uiToast';

const BY_ETHNICITY_LIMIT = 12;
const PIE_COLORS = ['#4F46E5', '#0891B2', '#16A34A', '#D97706', '#DC2626', '#7C3AED'];

type KeyValueChartRow = {
  name: string;
  value: number;
};

function mapToChartRows(input?: Record<string, number> | null): KeyValueChartRow[] {
  if (!input) return [];
  return Object.entries(input)
    .map(([name, value]) => ({
      name,
      value: Number.isFinite(value) ? Number(value) : 0,
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);
}

export interface ContentAnalyticsPanelProps {
  className?: string;
}

export default function ContentAnalyticsPanel({ className }: ContentAnalyticsPanelProps) {
  const [content, setContent] = useState<ContentAnalyticsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyticsApi.getContent('songs');
      setContent(result);
    } catch (err) {
      setContent(null);
      setError('Không thể tải nội dung phân tích bộ sưu tập.');
      uiToast.fromApiError(err, 'common.http_500');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

  const byEthnicity = useMemo(
    () => mapToChartRows(content?.byEthnicity).slice(0, BY_ETHNICITY_LIMIT),
    [content?.byEthnicity],
  );
  const byRegion = useMemo(() => mapToChartRows(content?.byRegion), [content?.byRegion]);
  const totalSongs = content?.totalSongs ?? 0;

  return (
    <section
      className={`rounded-2xl border border-neutral-200/80 p-6 shadow-lg transition-all duration-300 hover:shadow-xl ${className ?? ''} bg-surface-panel`}
      aria-live="polite"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-neutral-900">Phân tích nội dung bộ sưu tập</h3>
        <button
          type="button"
          onClick={() => void loadContent()}
          disabled={loading}
          className="rounded-lg border border-neutral-200/80 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-60"
        >
          Làm mới
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải dữ liệu content analytics...
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="mb-5 rounded-xl border border-indigo-100 bg-indigo-50/50 px-4 py-3">
            <p className="text-sm font-medium text-indigo-800">Tổng số bài hát</p>
            <p className="text-3xl font-bold text-indigo-700">{totalSongs}</p>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <h4 className="mb-2 text-sm font-semibold text-neutral-800">Theo dân tộc (top)</h4>
              {byEthnicity.length === 0 ? (
                <p className="text-sm text-neutral-500">Không có dữ liệu theo dân tộc.</p>
              ) : (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={byEthnicity}
                      layout="vertical"
                      margin={{ top: 8, right: 16, left: 4, bottom: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis type="number" tick={{ fill: '#525252', fontSize: 12 }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={130}
                        tick={{ fill: '#404040', fontSize: 12 }}
                      />
                      <Tooltip
                        formatter={(value) => [`${Number(value ?? 0)}`, 'Số bài']}
                        labelFormatter={(label) => `Dân tộc: ${label}`}
                        contentStyle={{ borderRadius: 12, borderColor: '#E5E7EB' }}
                      />
                      <Bar dataKey="value" fill="#4F46E5" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-neutral-800">Theo vùng</h4>
              {byRegion.length === 0 ? (
                <p className="text-sm text-neutral-500">Không có dữ liệu theo vùng.</p>
              ) : (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={byRegion}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        innerRadius={40}
                        label={(entry) => entry.name}
                      >
                        {byRegion.map((item, idx) => (
                          <Cell key={`${item.name}-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${Number(value ?? 0)}`, 'Số bài']}
                        contentStyle={{ borderRadius: 12, borderColor: '#E5E7EB' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
