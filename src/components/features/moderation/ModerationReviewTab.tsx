import { FileText } from 'lucide-react';
import type { ReactNode } from 'react';

import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ModerationQueueSidebar } from '@/components/features/moderation/ModerationQueueSidebar';
import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import type { ModerationQueueStatusMeta } from '@/features/moderation/utils/queueStatusMeta';

export interface ModerationReviewTabProps {
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
  isDetailLoading?: boolean;
  detailContent: ReactNode;
}

export default function ModerationReviewTab({
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
  isDetailLoading = false,
  detailContent,
}: ModerationReviewTabProps) {
  return (
    <div
      id="moderation-panel-review"
      role="tabpanel"
      aria-labelledby="moderation-tab-review"
      className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)] lg:gap-8 xl:gap-10 lg:items-start p-4 pt-3"
    >
      <ModerationQueueSidebar
        queueStatusMeta={queueStatusMeta}
        statusFilter={statusFilter}
        onStatusFilterChange={onStatusFilterChange}
        dateSort={dateSort}
        onDateSortChange={onDateSortChange}
        searchQuery={searchQuery}
        onSearchQueryChange={onSearchQueryChange}
        items={items}
        selectedId={selectedId}
        currentUserId={currentUserId}
        onSelect={onSelect}
      />

      <div className="rounded-2xl border border-secondary-200/50 bg-gradient-to-br from-surface-panel via-cream-50/80 to-secondary-50/50 overflow-y-auto p-4 sm:p-6 shadow-lg backdrop-blur-sm">
        {selectedId ? (
          isDetailLoading ? (
            <div className="flex min-h-[320px] items-center justify-center">
              <div className="text-center">
                <LoadingSpinner size="lg" />
                <p className="mt-3 text-sm font-medium text-neutral-600">Đang tải chi tiết bản thu...</p>
              </div>
            </div>
          ) : (
            detailContent
          )
        ) : (
          <div className="flex items-center justify-center min-h-[320px]">
            <div className="max-w-md w-full rounded-2xl border-2 border-dashed border-primary-200 bg-white/90 p-8 text-center shadow-sm">
              <FileText className="h-14 w-14 text-primary-300 mb-4 mx-auto" />
              <h3 className="text-lg font-semibold text-neutral-800 mb-1">Chọn một bản thu</h3>
              <p className="text-sm text-neutral-500">
                Chọn bản thu từ hàng đợi bên trái để xem chi tiết và kiểm duyệt.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
