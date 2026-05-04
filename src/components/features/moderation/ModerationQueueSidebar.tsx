import { Search, MapPin, Music, User as UserIcon } from 'lucide-react';

import SearchableDropdown from '@/components/common/SearchableDropdown';
import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import type { ModerationQueueStatusMeta } from '@/features/moderation/utils/queueStatusMeta';
import { ModerationStatus } from '@/types';
import { formatDateTime, getModerationStatusLabel } from '@/utils/helpers';

export function ModerationQueueSidebar({
  queueStatusMeta,
  statusFilter,
  onStatusFilterChange,
  dateSort,
  onDateSortChange,
  searchQuery,
  onSearchQueryChange,
  items,
  selectedId,
  currentUserId,
  onSelect,
}: {
  queueStatusMeta: ModerationQueueStatusMeta;
  statusFilter: string;
  onStatusFilterChange: (v: string) => void;
  dateSort: 'newest' | 'oldest';
  onDateSortChange: (v: 'newest' | 'oldest') => void;
  searchQuery: string;
  onSearchQueryChange: (v: string) => void;
  items: LocalRecordingMini[];
  selectedId: string | null;
  currentUserId?: string;
  onSelect: (id: string | null) => void;
}) {
  const visibleQueueItems = items.filter((it) => it.id);
  return (
    <div
      /* Keep sticky offsets aligned with MainLayout header like Upload/Contributions pages. */
      className="rounded-2xl border border-secondary-200/50 bg-gradient-to-b from-surface-panel to-secondary-50/55 shadow-lg backdrop-blur-sm flex flex-col overflow-hidden lg:sticky lg:top-32 lg:self-start lg:max-h-[min(100vh-10rem,56rem)] xl:top-40 xl:max-h-[min(100vh-12rem,56rem)]"
      aria-label="Hàng đợi kiểm duyệt (sidebar)"
    >
      <div className="p-4 flex-shrink-0 bg-gradient-to-b from-amber-50/40 to-white">
        <h2 className="text-lg font-semibold text-neutral-900 mb-1">Hàng đợi kiểm duyệt</h2>
        <p className="text-xs text-neutral-600 mb-3">
          Theo dõi bản thu theo trạng thái và ưu tiên xử lý bản mới.
        </p>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
            <input
              type="search"
              placeholder="Tìm bản thu..."
              aria-label="Tìm kiếm trong hàng đợi kiểm duyệt"
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-amber-200 bg-white text-neutral-900 placeholder:text-neutral-500 text-sm shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:border-primary-500"
            />
          </div>

          <div className="space-y-2">
            {queueStatusMeta.groups.map((group) => (
              <div key={group.title}>
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                    {group.title}
                  </span>
                  <span className="text-[11px] text-neutral-500">
                    {group.items
                      .filter((f) => f.key !== 'ALL')
                      .reduce((sum, f) => sum + f.count, 0)}{' '}
                    bản thu
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {group.items.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => onStatusFilterChange(f.key)}
                      aria-pressed={statusFilter === f.key}
                      aria-label={`Lọc hàng đợi: ${f.label} (${f.count})`}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer border focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 ${
                        statusFilter === f.key
                          ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                          : 'bg-neutral-100 text-neutral-700 border-neutral-200 hover:bg-primary-50 hover:border-primary-200 hover:text-primary-700'
                      }`}
                    >
                      <span>{f.label}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] leading-none ${
                          statusFilter === f.key
                            ? 'bg-white/20 text-white'
                            : 'bg-white text-neutral-600 border border-neutral-200'
                        }`}
                      >
                        {f.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <p className="block text-xs font-medium text-neutral-600">Sắp xếp theo ngày</p>
            <SearchableDropdown
              value={dateSort === 'newest' ? 'Mới nhất' : 'Cũ nhất'}
              onChange={(val) => onDateSortChange(val === 'Mới nhất' ? 'newest' : 'oldest')}
              options={['Mới nhất', 'Cũ nhất']}
              placeholder="Chọn thứ tự"
              searchable={false}
              ariaLabel="Sắp xếp theo ngày"
            />
          </div>
        </div>
      </div>

      <div
        className="flex-1 overflow-y-auto min-h-0"
        role="region"
        aria-label="Danh sách bản thu trong hàng đợi kiểm duyệt"
      >
        {items.length === 0 ? (
          <div
            className="m-4 rounded-2xl border-2 border-dashed border-amber-200 bg-amber-50/40 p-6 text-center text-neutral-600 text-sm"
            role="status"
          >
            {searchQuery.trim()
              ? `Không có kết quả cho "${searchQuery.trim()}".`
              : 'Không có bản thu nào trong hàng đợi.'}
          </div>
        ) : (
          <div role="list" aria-label="Danh sách bản thu chờ xử lý">
            {visibleQueueItems.map((it, idx) => {
              const status = it.moderation?.status;
              const borderColor =
                status === ModerationStatus.PENDING_REVIEW
                  ? 'border-l-neutral-400'
                  : status === ModerationStatus.IN_REVIEW
                    ? 'border-l-primary-500'
                    : status === ModerationStatus.APPROVED
                      ? 'border-l-green-500'
                      : 'border-l-red-400';
              const rowTitle = it.basicInfo?.title || it.title || 'Không có tiêu đề';
              const claimedByMe =
                !!currentUserId &&
                status === ModerationStatus.IN_REVIEW &&
                (it.moderation?.claimedBy === currentUserId ||
                  it.moderation?.reviewerId === currentUserId);
              return (
                <div
                  key={it.id}
                  role="button"
                  tabIndex={selectedId === it.id ? 0 : -1}
                  id={`moderation-queue-item-${it.id}`}
                  aria-label={
                    selectedId === it.id
                      ? `${rowTitle}, trạng thái ${getModerationStatusLabel(status)}, đang chọn`
                      : `${rowTitle}, trạng thái ${getModerationStatusLabel(status)}`
                  }
                  aria-current={selectedId === it.id ? 'true' : undefined}
                  data-selected={selectedId === it.id ? 'true' : undefined}
                  onClick={() => onSelect(it.id ?? null)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onSelect(it.id ?? null);
                      return;
                    }
                    if (
                      e.key !== 'ArrowDown' &&
                      e.key !== 'ArrowUp' &&
                      e.key !== 'Home' &&
                      e.key !== 'End'
                    ) {
                      return;
                    }
                    e.preventDefault();
                    if (visibleQueueItems.length === 0) return;
                    let nextIndex = idx;
                    if (e.key === 'ArrowDown')
                      nextIndex = Math.min(visibleQueueItems.length - 1, idx + 1);
                    if (e.key === 'ArrowUp') nextIndex = Math.max(0, idx - 1);
                    if (e.key === 'Home') nextIndex = 0;
                    if (e.key === 'End') nextIndex = visibleQueueItems.length - 1;
                    const nextId = visibleQueueItems[nextIndex]?.id;
                    if (!nextId) return;
                    onSelect(nextId);
                    requestAnimationFrame(() => {
                      const nextEl = document.getElementById(`moderation-queue-item-${nextId}`);
                      nextEl?.focus();
                    });
                  }}
                  className={`m-2 p-4 rounded-xl border border-neutral-200 cursor-pointer transition-all duration-200 border-l-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 focus-visible:ring-offset-0 ${borderColor} ${
                    selectedId === it.id
                      ? 'bg-primary-50 shadow-sm border-primary-200'
                      : 'hover:bg-amber-50/40 hover:shadow-sm'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1.5 mb-1">
                    <h3 className="text-sm font-semibold text-neutral-900 line-clamp-2 pr-1">
                      {rowTitle}
                    </h3>
                    <div className="flex flex-wrap items-center gap-1 shrink-0">
                      <span className="w-fit px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-200 text-neutral-900 border border-neutral-400/50">
                        {getModerationStatusLabel(status)}
                      </span>
                      {claimedByMe && (
                        <span className="w-fit px-2 py-0.5 rounded text-[11px] font-semibold bg-primary-100 text-primary-800 border border-primary-300/70">
                          Đã nhận
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-600">
                    <UserIcon className="h-3.5 w-3.5 shrink-0" />
                    <span>{it.uploader?.username || 'Khách'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-neutral-600 mt-0.5">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {it.culturalContext?.ethnicity || '—'}
                      {it.culturalContext?.province && ` • ${it.culturalContext?.province}`}
                    </span>
                  </div>
                  {(it.culturalContext?.instruments?.length ?? 0) > 0 && (
                    <div className="flex items-center gap-1.5 text-xs text-neutral-600 mt-0.5">
                      <Music className="h-3.5 w-3.5 shrink-0" />
                      <span>{(it.culturalContext?.instruments ?? []).slice(0, 2).join(', ')}</span>
                    </div>
                  )}
                  <div className="text-xs text-neutral-500 mt-2 pt-2 border-t border-neutral-100">
                    {formatDateTime(
                      (it as LocalRecordingMini & { uploadedDate?: string }).uploadedDate ||
                        it.uploadedAt,
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default ModerationQueueSidebar;
