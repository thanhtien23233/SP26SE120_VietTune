import { AlertCircle, ChevronLeft, ChevronRight, FileAudio } from 'lucide-react';
import type { Dispatch, SetStateAction } from 'react';

import LoadingSpinner from '@/components/common/LoadingSpinner';
import { ContributionCard } from '@/components/features/contributions/ContributionCard';
import type { Submission } from '@/services/submissionService';

export default function ContributionsListSection({
  error,
  loading,
  submissions,
  activeStatusTab,
  page,
  setPage,
  hasMore,
  instrumentNameById,
  onOpenDetail,
  onRequestDelete,
}: {
  error: string | null;
  loading: boolean;
  submissions: Submission[];
  activeStatusTab: number | 'ALL';
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
  hasMore: boolean;
  instrumentNameById: Map<string, string>;
  onOpenDetail: (submissionId: string) => void;
  onRequestDelete: (id: string) => void;
}) {
  return (
    <>
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200/80 bg-red-50/90 p-4 shadow-sm">
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-600" strokeWidth={2.5} />
          <p className="font-medium text-red-900">{error}</p>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <LoadingSpinner size="lg" />
          <p className="font-medium leading-relaxed text-neutral-600">Đang tải danh sách đóng góp...</p>
        </div>
      )}

      {!loading && !error && submissions.length === 0 && (
        <div className="py-10 text-center">
          <FileAudio className="mx-auto mb-4 h-12 w-12 text-neutral-400" strokeWidth={1.5} aria-hidden />
          <h3 className="mb-2 text-lg font-semibold text-neutral-800">Chưa có dữ liệu trong mục này</h3>
          <p className="mx-auto max-w-md font-medium leading-relaxed text-neutral-600">
            {activeStatusTab === 0 && 'Chưa có bản ghi nháp.'}
            {activeStatusTab === 1 && 'Chưa có đóng góp đang chờ phê duyệt.'}
            {activeStatusTab === 2 && 'Chưa có đóng góp được duyệt.'}
            {activeStatusTab === 3 && 'Chưa có đóng góp bị từ chối.'}
            {activeStatusTab === 4 && 'Chưa có bản ghi đang yêu cầu cập nhật.'}
            {activeStatusTab === 'ALL' && 'Bạn chưa có đóng góp nào. Hãy thử tải lên từ trang Đóng góp.'}
          </p>
        </div>
      )}

      {!loading && !error && submissions.length > 0 && (
        <div className="space-y-4">
          {submissions.map((sub) => {
            const instrumentLine = sub.recording?.instrumentIds?.length
              ? sub.recording.instrumentIds
                  .map((id) => instrumentNameById.get(id) || 'Nhạc cụ')
                  .join(', ')
              : '';
            return (
              <ContributionCard
                key={sub.id}
                sub={sub}
                instrumentLine={instrumentLine}
                onOpen={onOpenDetail}
                onRequestDelete={onRequestDelete}
              />
            );
          })}
        </div>
      )}

      {!loading && !error && (submissions.length > 0 || page > 1) && (
        <div className="mt-8 flex items-center justify-center gap-4 border-t border-secondary-200/70 pt-6">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-secondary-200/80 bg-white/80 px-4 py-2 font-medium text-neutral-800 shadow-sm transition-colors hover:border-secondary-300/80 hover:bg-secondary-50/90 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Trước
          </button>
          <span className="text-sm font-semibold text-neutral-800">Trang {page}</span>
          <button
            type="button"
            disabled={!hasMore}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-secondary-200/80 bg-white/80 px-4 py-2 font-medium text-neutral-800 shadow-sm transition-colors hover:border-secondary-300/80 hover:bg-secondary-50/90 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
          >
            Sau
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
