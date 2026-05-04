import { FileWarning } from 'lucide-react';
import { Link } from 'react-router-dom';

import type { LocalRecording } from '@/types';
import { getModerationStatusBadgeClassNames, getModerationStatusLabel } from '@/utils/helpers';

export type AdminRecordingTableProps = {
  recordings: LocalRecording[];
  onRequestRemove: (payload: { id: string; title: string }) => void;
};

export default function AdminRecordingTable({
  recordings,
  onRequestRemove,
}: AdminRecordingTableProps) {
  if (recordings.length === 0) {
    return (
      <div
        className="rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-8 text-center transition-all duration-300 bg-surface-panel"
      >
        <p className="text-neutral-500 font-medium">Chưa có bản ghi nào.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {recordings
        .filter((r) => r.id)
        .map((r) => {
          const rawStatus =
            (r.moderation as { status?: string | number } | undefined)?.status ?? 'PENDING_REVIEW';
          const title = r.basicInfo?.title ?? r.title ?? 'Không có tiêu đề';
          return (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-2xl border border-neutral-200/80 shadow-lg backdrop-blur-sm p-6 transition-all duration-300 hover:shadow-xl bg-surface-panel"
            >
              <div>
                <p className="font-semibold text-neutral-900 mb-1">{title}</p>
                <p className="text-sm text-neutral-600 font-medium">
                  Người đóng góp: {(r.uploader as { username?: string })?.username ?? 'Khách'} · Trạng
                  thái:{' '}
                  <span className={getModerationStatusBadgeClassNames(rawStatus)}>
                    {getModerationStatusLabel(rawStatus)}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to={`/recordings/${r.id}`}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium text-primary-600 hover:text-primary-700 border border-primary-200/80 hover:border-primary-300 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer bg-surface-panel"
                >
                  Xem
                </Link>
                <button
                  type="button"
                  onClick={() => onRequestRemove({ id: r.id!, title })}
                  className="inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-medium text-red-600 hover:text-red-700 border border-red-200/80 hover:border-red-300 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer bg-surface-panel"
                >
                  <FileWarning className="h-4 w-4" />
                  Xóa
                </button>
              </div>
            </div>
          );
        })}
    </div>
  );
}
