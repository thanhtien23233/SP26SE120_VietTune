import { BarChart3 } from 'lucide-react';

import { AdminAnalyticsStatGrid } from '@/components/admin/AdminStatsCards';
import ContentAnalyticsPanel from '@/components/features/analytics/ContentAnalyticsPanel';
import ContributorLeaderboard from '@/components/features/analytics/ContributorLeaderboard';
import CoverageGapChart from '@/components/features/analytics/CoverageGapChart';
import MonthlyTrendChart from '@/components/features/analytics/MonthlyTrendChart';

type RemoteInstruments = { id: string; name: string; category: string | undefined }[] | null;

export default function AdminDashboardAnalyticsPanel({
  remoteTotalRecordings,
  recordingsLength,
  remoteEthnicGroupsLoadState,
  ethnicGroupCount,
  allUsersCount,
  remoteInstrumentCount,
  remoteInstruments,
  monthlyCountsFinal,
}: {
  remoteTotalRecordings: number | null;
  recordingsLength: number;
  remoteEthnicGroupsLoadState: 'idle' | 'loading' | 'ok' | 'error';
  ethnicGroupCount: number;
  allUsersCount: number;
  remoteInstrumentCount: number | null;
  remoteInstruments: RemoteInstruments;
  monthlyCountsFinal: Record<string, number>;
}) {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-semibold text-neutral-900 mb-4 flex items-center gap-3">
        <div className="p-2 bg-secondary-100/90 rounded-lg shadow-sm">
          <BarChart3 className="h-5 w-5 text-secondary-600" strokeWidth={2.5} />
        </div>
        Phân tích bộ sưu tập
      </h2>
      <p className="text-neutral-700 font-medium leading-relaxed mb-6">
        Khoảng trống theo dân tộc, xu hướng đóng góp theo tháng, người đóng góp tích cực.
      </p>
      <AdminAnalyticsStatGrid
        remoteTotalRecordings={remoteTotalRecordings}
        recordingsLength={recordingsLength}
        remoteEthnicGroupsLoadState={remoteEthnicGroupsLoadState}
        ethnicGroupCount={ethnicGroupCount}
        allUsersCount={allUsersCount}
      />

      <div className="space-y-6">
        <div className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl bg-surface-panel">
          <h3 className="text-xl font-semibold text-neutral-900 mb-4 flex items-center justify-between gap-3">
            <span>Nhạc cụ</span>
            <span className="text-primary-600 font-bold">{remoteInstrumentCount ?? '—'}</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {!remoteInstruments && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-700 text-sm font-semibold">
                Đang tải…
              </span>
            )}
            {remoteInstruments && remoteInstruments.length === 0 && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-700 text-sm font-semibold">
                Chưa có dữ liệu.
              </span>
            )}
            {remoteInstruments && remoteInstruments.length > 0 && (
              <>
                {remoteInstruments.slice(0, 24).map((ins) => (
                  <span
                    key={ins.id}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium bg-primary-100 text-primary-800"
                    title={ins.category ? `Nhóm: ${ins.category}` : undefined}
                  >
                    {ins.name}
                  </span>
                ))}
                {remoteInstruments.length > 24 && (
                  <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-neutral-100 text-neutral-700 text-sm font-semibold">
                    +{remoteInstruments.length - 24}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        <CoverageGapChart />
        <ContentAnalyticsPanel />
        <MonthlyTrendChart data={monthlyCountsFinal} />
        <ContributorLeaderboard />
      </div>
    </div>
  );
}
