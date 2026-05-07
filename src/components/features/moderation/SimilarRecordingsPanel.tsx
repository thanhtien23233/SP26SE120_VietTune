import { Loader2, Music, MapPin } from 'lucide-react';

import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import { getModerationStatusLabel } from '@/utils/helpers';

type SimilarRecordingsPanelProps = {
  items: LocalRecordingMini[];
  loading: boolean;
  error: string | null;
};

function resolveTitle(item: LocalRecordingMini): string {
  return item.basicInfo?.title || item.title || 'Không có tiêu đề';
}

export default function SimilarRecordingsPanel({
  items,
  loading,
  error,
}: SimilarRecordingsPanelProps) {
  return (
    <section
      className="rounded-2xl border border-neutral-200/80 bg-surface-panel p-4 shadow-sm"
      aria-label="Bản thu tương tự"
    >
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-neutral-900">Bản thu tương tự</h3>
        <p className="text-xs text-neutral-600">Gợi ý để đối chiếu ngữ cảnh và nhạc cụ liên quan.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Đang tải bản thu tương tự...
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Chưa tải được danh sách tương tự: {error}
        </div>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-3 py-3 text-xs text-neutral-600">
          Chưa có bản thu tương tự phù hợp.
        </div>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <ul className="space-y-2" aria-label="Danh sách bản thu tương tự">
          {items.map((item) => (
            <li key={item.id} className="rounded-xl border border-neutral-200 bg-white px-3 py-2">
              <p className="text-sm font-medium text-neutral-900">{resolveTitle(item)}</p>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-neutral-600">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {item.culturalContext?.province || item.culturalContext?.region || '—'}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Music className="h-3.5 w-3.5" />
                  {(item.culturalContext?.instruments ?? []).slice(0, 2).join(', ') || '—'}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-neutral-500">
                Trạng thái: {getModerationStatusLabel(item.moderation?.status)}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
