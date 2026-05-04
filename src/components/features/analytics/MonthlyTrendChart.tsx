import { AlertCircle } from 'lucide-react';
import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type MonthlyTrendPoint = {
  monthKey: string;
  monthLabel: string;
  count: number;
};

function asMonthlyTrendData(source: Record<string, number>): MonthlyTrendPoint[] {
  return Object.entries(source)
    .map(([monthKey, rawCount]) => {
      const [year, month] = monthKey.split('-');
      const monthLabel =
        year && month ? `${month.padStart(2, '0')}/${year}` : monthKey;
      return {
        monthKey,
        monthLabel,
        count: Number.isFinite(rawCount) ? Number(rawCount) : 0,
      };
    })
    .sort((a, b) => a.monthKey.localeCompare(b.monthKey));
}

export interface MonthlyTrendChartProps {
  data: Record<string, number>;
  className?: string;
}

export default function MonthlyTrendChart({ data, className }: MonthlyTrendChartProps) {
  const points = useMemo(() => asMonthlyTrendData(data), [data]);
  const hasData = points.some((p) => p.count > 0);

  return (
    <section
      className={`rounded-2xl border border-neutral-200/80 p-6 shadow-lg transition-all duration-300 hover:shadow-xl ${className ?? ''} bg-surface-panel`}
      aria-live="polite"
    >
      <h3 className="mb-4 text-xl font-semibold text-neutral-900">Đóng góp theo tháng</h3>

      {!hasData ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertCircle className="h-4 w-4" />
          Chưa có dữ liệu xu hướng theo tháng.
        </div>
      ) : (
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={points} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="monthLabel" tick={{ fill: '#525252', fontSize: 12 }} />
              <YAxis tick={{ fill: '#525252', fontSize: 12 }} />
              <Tooltip
                formatter={(value) => [`${Number(value ?? 0)}`, 'Số đóng góp']}
                labelFormatter={(label) => `Tháng: ${label}`}
                contentStyle={{ borderRadius: 12, borderColor: '#E5E7EB' }}
              />
              <Bar dataKey="count" fill="#16A34A" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
