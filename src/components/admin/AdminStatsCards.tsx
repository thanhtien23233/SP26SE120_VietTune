import { Database, Flag, Gauge, MapPin, Music, Users } from 'lucide-react';

export function AdminAnalyticsStatGrid({
  remoteTotalRecordings,
  recordingsLength,
  remoteEthnicGroupsLoadState,
  ethnicGroupCount,
  allUsersCount,
}: {
  remoteTotalRecordings: number | null;
  recordingsLength: number;
  remoteEthnicGroupsLoadState: 'idle' | 'loading' | 'ok' | 'error';
  ethnicGroupCount: number;
  allUsersCount: number;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div
        className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl bg-surface-panel"
      >
        <div className="bg-primary-100/90 rounded-full w-12 h-12 flex items-center justify-center mb-4 shadow-sm">
          <Music className="h-6 w-6 text-primary-600" strokeWidth={2.5} />
        </div>
        <div className="text-neutral-600 font-medium mb-2">Tổng bản ghi</div>
        <p className="text-3xl font-bold text-primary-600">
          {remoteTotalRecordings ?? recordingsLength}
        </p>
      </div>
      <div
        className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl bg-surface-panel"
      >
        <div className="bg-secondary-100/90 rounded-full w-12 h-12 flex items-center justify-center mb-4 shadow-sm">
          <MapPin className="h-6 w-6 text-secondary-600" strokeWidth={2.5} />
        </div>
        <div className="text-neutral-600 font-medium mb-2">Dân tộc</div>
        <p className="text-3xl font-bold text-primary-600">
          {remoteEthnicGroupsLoadState === 'ok' ? ethnicGroupCount : '—'}
        </p>
      </div>
      <div
        className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl bg-surface-panel"
      >
        <div className="bg-primary-100/90 rounded-full w-12 h-12 flex items-center justify-center mb-4 shadow-sm">
          <Users className="h-6 w-6 text-primary-600" strokeWidth={2.5} />
        </div>
        <div className="text-neutral-600 font-medium mb-2">Người dùng</div>
        <p className="text-3xl font-bold text-primary-600">{allUsersCount}</p>
      </div>
    </div>
  );
}

export function AdminAiMonitoringStatGrid({
  avgExpertAccuracy,
  aiFlaggedCount,
  remoteKbCount,
}: {
  avgExpertAccuracy: number | null;
  aiFlaggedCount: number | null;
  remoteKbCount: number | null;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div
        className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl bg-surface-panel"
      >
        <div className="bg-primary-100/90 rounded-full w-12 h-12 flex items-center justify-center mb-4 shadow-sm">
          <Gauge className="h-6 w-6 text-primary-600" strokeWidth={2.5} />
        </div>
        <div className="text-neutral-600 font-medium mb-2">Độ chính xác</div>
        <p className="text-3xl font-bold text-primary-600">
          {avgExpertAccuracy == null ? '—' : `${avgExpertAccuracy.toFixed(1)}%`}
        </p>
        <div className="text-sm text-neutral-600 font-medium mt-2">
          Trung bình accuracy từ dữ liệu hiệu suất chuyên gia.
        </div>
      </div>

      <div
        className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl bg-surface-panel"
      >
        <div className="bg-amber-100/90 rounded-full w-12 h-12 flex items-center justify-center mb-4 shadow-sm">
          <Flag className="h-6 w-6 text-amber-700" strokeWidth={2.5} />
        </div>
        <div className="text-neutral-600 font-medium mb-2">Câu trả lời bị cắm cờ</div>
        <p className="text-3xl font-bold text-primary-600">{aiFlaggedCount ?? '—'}</p>
      </div>

      <div
        className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl bg-surface-panel"
      >
        <div className="bg-secondary-100/90 rounded-full w-12 h-12 flex items-center justify-center mb-4 shadow-sm">
          <Database className="h-6 w-6 text-secondary-600" strokeWidth={2.5} />
        </div>
        <div className="text-neutral-600 font-medium mb-2">Cơ sở tri thức</div>
        <p className="text-3xl font-bold text-primary-600">{remoteKbCount ?? '—'}</p>
      </div>
    </div>
  );
}
