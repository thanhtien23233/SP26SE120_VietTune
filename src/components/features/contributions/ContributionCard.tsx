import { Clock, Music, Trash2, User } from 'lucide-react';
import { memo } from 'react';

import {
  CONTRIBUTOR_STAGE_INFO,
  CONTRIBUTOR_STATUS_LABELS,
  formatContributionDate,
  formatContributionPerformanceType,
} from '@/features/contributions/contributionDisplayUtils';
import type { Submission } from '@/services/submissionService';
import { cn } from '@/utils/helpers';

export const ContributionStatusBadge = memo(function ContributionStatusBadge({
  status,
}: {
  status: number;
}) {
  const info = CONTRIBUTOR_STATUS_LABELS[status] || {
    label: `Trạng thái ${status}`,
    color: 'bg-neutral-100 text-neutral-700 border-neutral-300',
  };
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${info.color}`}
    >
      {info.label}
    </span>
  );
});

export const ContributionStageBadge = memo(function ContributionStageBadge({ stage }: { stage: number }) {
  const info = CONTRIBUTOR_STAGE_INFO[stage] || {
    label: `Giai đoạn ${stage}`,
    color: 'bg-neutral-100 text-neutral-600 border-neutral-300',
  };
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${info.color}`}
    >
      {info.label}
    </span>
  );
});

function ContributionCardInner({
  sub,
  instrumentLine,
  onOpen,
  onRequestDelete,
}: {
  sub: Submission;
  instrumentLine: string;
  onOpen: (submissionId: string) => void;
  onRequestDelete: (submissionId: string) => void;
}) {
  const title = sub.recording?.title || 'Chưa có tiêu đề';
  const performer = sub.recording?.performerName || 'Chưa rõ nghệ sĩ';
  const dateStr = formatContributionDate(sub.submittedAt);

  return (
    <div
      className={cn(
        'group cursor-pointer overflow-hidden rounded-2xl border border-secondary-200/70 bg-gradient-to-b from-surface-panel via-cream-50/80 to-secondary-50/45 shadow-md transition-all duration-300',
        'hover:border-secondary-300/80 hover:shadow-lg',
      )}
      onClick={() => onOpen(sub.id)}
    >
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-neutral-900 truncate transition-colors group-hover:text-secondary-900">
              {title}
            </h3>
            <p className="text-sm text-neutral-600 font-medium mt-0.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 flex-shrink-0" />
              {performer}
            </p>
          </div>
          <ContributionStatusBadge status={sub.status} />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-y-3 mt-4 text-sm text-neutral-600">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5" />
              {dateStr}
            </span>
            {sub.status === 1 && (
              <div className="flex items-center gap-1.5 font-medium">
                <span className="text-neutral-400 text-xs">Giai đoạn:</span>
                <ContributionStageBadge stage={sub.currentStage} />
              </div>
            )}
            {(sub.recording?.performanceContext || instrumentLine) && (
              <div
                className="flex items-center gap-1.5 font-medium"
                title={[
                  sub.recording?.performanceContext
                    ? formatContributionPerformanceType(sub.recording.performanceContext)
                    : '',
                  instrumentLine,
                ]
                  .filter(Boolean)
                  .join(' - ')}
              >
                <Music className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="line-clamp-1">
                  {[
                    sub.recording?.performanceContext
                      ? formatContributionPerformanceType(sub.recording.performanceContext)
                      : '',
                    instrumentLine,
                  ]
                    .filter(Boolean)
                    .join(' - ')}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            className="flex items-center gap-1.5 rounded-xl border border-red-200/80 bg-red-50/90 px-3 py-1.5 text-sm font-semibold text-red-800 shadow-sm transition-all hover:border-red-300 hover:bg-red-100/90 hover:shadow-md active:scale-95 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
            onClick={(e) => {
              e.stopPropagation();
              onRequestDelete(sub.id);
            }}
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
            <span className="font-semibold text-xs">Xóa</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export const ContributionCard = memo(ContributionCardInner);
ContributionCard.displayName = 'ContributionCard';
