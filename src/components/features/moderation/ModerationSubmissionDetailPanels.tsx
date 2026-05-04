import type { LucideIcon } from 'lucide-react';

import { EXPERT_API_PHASE2 } from '@/config/expertWorkflowPhase';
import { MODERATION_EXPERT_TEXTAREA_MAX_LENGTH } from '@/config/validationConstants';
import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import { ModerationStatus } from '@/types';
import { toModerationUiStatus } from '@/types/moderation';

export type ModerationSubmissionInfoRow = {
  key: string;
  icon: LucideIcon | null;
  label: string;
  value: string;
};

function isPlaceholderField(value?: string | null): boolean {
  const raw = String(value ?? '')
    .trim()
    .toLowerCase();
  return (
    raw === '' ||
    raw === '—' ||
    raw === '-' ||
    raw === 'không xác định' ||
    raw === 'không có tiêu đề' ||
    raw === 'untitled'
  );
}

export function ModerationSubmissionDetailPanels({
  item,
  currentUserId,
  expertReviewNotesDraft,
  onExpertReviewNotesChange,
  infoRows,
}: {
  item: LocalRecordingMini;
  currentUserId?: string;
  expertReviewNotesDraft: string;
  onExpertReviewNotesChange: (submissionId: string, text: string) => void;
  infoRows: readonly ModerationSubmissionInfoRow[];
}) {
  const submissionId = item.id;
  const showExpertNotes =
    !!submissionId &&
    !!currentUserId &&
    item.moderation?.claimedBy === currentUserId &&
    toModerationUiStatus(item.moderation?.status) === ModerationStatus.IN_REVIEW;

  return (
    <>
      {showExpertNotes && submissionId && (
        <div className="rounded-2xl border border-neutral-200/80 p-4 sm:p-5 bg-white shadow-sm">
          <label
            htmlFor={`expert-review-notes-detail-${submissionId}`}
            className="block text-sm font-semibold text-neutral-900 mb-1"
          >
            Ghi chú chuyên gia
          </label>
          <p
            id={`expert-review-notes-detail-hint-${submissionId}`}
            className="text-xs text-neutral-600 mb-3 leading-relaxed"
          >
            {EXPERT_API_PHASE2
              ? 'Đồng bộ với hộp thoại kiểm duyệt; gửi nhật ký khi hoàn tất trên máy chủ.'
              : 'Lưu cục bộ trên trình duyệt theo mã bản thu.'}
          </p>
          <textarea
            id={`expert-review-notes-detail-${submissionId}`}
            value={expertReviewNotesDraft}
            onChange={(e) => onExpertReviewNotesChange(submissionId, e.target.value)}
            rows={4}
            maxLength={MODERATION_EXPERT_TEXTAREA_MAX_LENGTH}
            placeholder="Theo dõi ngữ cảnh, nguồn tham chiếu…"
            aria-describedby={`expert-review-notes-detail-hint-${submissionId}`}
            className="w-full rounded-xl border border-neutral-200/90 bg-surface-panel px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus:border-primary-400/60 resize-y min-h-[96px]"
          />
        </div>
      )}
      <div className="rounded-2xl border border-neutral-200/80 p-4 bg-white shadow-sm">
        <h3 className="text-base font-semibold text-neutral-900 mb-3">Thông tin bản thu</h3>
        <ul className="space-y-2 text-sm">
          {infoRows.map((row) => {
            const muted = isPlaceholderField(row.value);
            const Icon = row.icon;
            return (
              <li
                key={row.key}
                className={`flex items-center gap-2 ${muted ? 'text-neutral-500' : 'text-neutral-800'}`}
              >
                {Icon ? (
                  <Icon className="h-4 w-4 text-neutral-500" />
                ) : (
                  <span className="inline-block h-4 w-4" aria-hidden />
                )}
                <span>
                  {row.label}:{' '}
                  <span className={muted ? 'italic text-neutral-400' : ''}>{row.value}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      {(item.moderation?.rejectionNote || item.moderation?.notes) &&
        (() => {
          const rej = item.moderation?.rejectionNote?.trim();
          const n = item.moderation?.notes?.trim();
          const same = !!(rej && n && rej === n);
          return (
            <div
              className="rounded-2xl border border-amber-200/90 p-4 bg-amber-50 shadow-sm"
              role="region"
              aria-label="Ghi chú kiểm duyệt"
            >
              <h3 className="text-base font-semibold text-neutral-900 mb-2">Ghi chú kiểm duyệt</h3>
              {same ? (
                <div>
                  <p className="text-xs font-semibold text-neutral-800 uppercase tracking-wide mb-1">
                    Lý do &amp; ghi chú chuyên gia
                  </p>
                  <p className="text-sm text-neutral-900 whitespace-pre-wrap">{n}</p>
                </div>
              ) : (
                <>
                  {rej && (
                    <div className="mb-3 last:mb-0">
                      <p className="text-xs font-semibold text-neutral-800 uppercase tracking-wide mb-1">
                        Lý do từ chối
                      </p>
                      <p className="text-sm text-neutral-900 whitespace-pre-wrap">{rej}</p>
                    </div>
                  )}
                  {n && (
                    <div>
                      <p className="text-xs font-semibold text-neutral-800 uppercase tracking-wide mb-1">
                        Ghi chú chuyên gia
                      </p>
                      <p className="text-sm text-neutral-900 whitespace-pre-wrap">{n}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}
    </>
  );
}
