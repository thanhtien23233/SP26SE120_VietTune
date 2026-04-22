import { CheckCircle, Trash2, UserCheck, XCircle } from 'lucide-react';

import Button from '@/components/common/Button';
import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import { isLockedToAnotherExpert } from '@/features/moderation/utils/expertSubmissionLock';
import { ModerationStatus } from '@/types';
import { toModerationUiStatus } from '@/types/moderation';

function hasWizardProgress(m?: LocalRecordingMini['moderation']): boolean {
  if (!m) return false;
  if ((m.verificationStep ?? 1) > 1) return true;
  const vd = m.verificationData;
  if (!vd) return false;
  const s1 = vd.step1;
  if (s1 && (s1.infoComplete || s1.infoAccurate || s1.formatCorrect)) return true;
  const s2 = vd.step2;
  if (s2 && (s2.culturalValue || s2.authenticity || s2.accuracy)) return true;
  const s3 = vd.step3;
  if (s3 && (s3.crossChecked || s3.sourcesVerified || s3.finalApproval)) return true;
  return false;
}

export function ModerationClaimActions({
  item,
  currentUserId,
  onAssign,
  onUnclaim,
  onOpenWizard,
  onRequestDelete,
}: {
  item: LocalRecordingMini;
  currentUserId?: string;
  onAssign: (id: string) => void;
  onUnclaim: (id: string) => void;
  onOpenWizard: (id: string) => void;
  onRequestDelete: (id: string) => void;
}) {
  const status = toModerationUiStatus(item.moderation?.status);
  const claimedByMe =
    !!currentUserId &&
    status === ModerationStatus.IN_REVIEW &&
    (item.moderation?.claimedBy === currentUserId ||
      item.moderation?.reviewerId === currentUserId);
  const isPending = status === ModerationStatus.PENDING_REVIEW;
  const lockedToSomeoneElse = isLockedToAnotherExpert(item.moderation, currentUserId);

  return (
    <div className="flex flex-col gap-2">
      {isPending && !lockedToSomeoneElse && item.id && (
        <Button
          type="button"
          onClick={() => onAssign(item.id!)}
          aria-label="Nhận bài để kiểm duyệt"
          variant="primary"
          className="inline-flex items-center gap-2 rounded-xl bg-green-700 hover:bg-green-600 focus-visible:ring-white focus-visible:ring-offset-neutral-800"
        >
          <UserCheck className="h-4 w-4 shrink-0" aria-hidden />
          Nhận bài để kiểm duyệt
        </Button>
      )}
      {isPending && lockedToSomeoneElse && (
        <p className="text-sm text-amber-100/95 bg-amber-900/35 rounded-xl px-4 py-2 border border-amber-600/40">
          Bản thu đã được gán cho chuyên gia khác hoặc đang được xử lý trên máy chủ.
        </p>
      )}
      {claimedByMe && item.id && (
        <>
          <Button
            type="button"
            onClick={() => onOpenWizard(item.id!)}
            aria-label={
              hasWizardProgress(item.moderation)
                ? 'Tiếp tục kiểm duyệt bản thu đã nhận'
                : 'Bắt đầu kiểm duyệt bản thu đã nhận'
            }
            variant="primary"
            className="inline-flex items-center gap-2 rounded-xl bg-green-700 hover:bg-green-600 focus-visible:ring-white focus-visible:ring-offset-neutral-800"
          >
            <CheckCircle className="h-4 w-4 shrink-0" aria-hidden />
            {hasWizardProgress(item.moderation)
              ? 'Tiếp tục kiểm duyệt'
              : 'Bắt đầu kiểm duyệt'}
          </Button>
          <Button
            type="button"
            onClick={() => onUnclaim(item.id!)}
            aria-label="Hủy nhận bài và trả bản thu về hàng đợi"
            variant="danger"
            className="inline-flex items-center gap-2 rounded-xl focus-visible:ring-white focus-visible:ring-offset-neutral-800"
          >
            <XCircle className="h-4 w-4 shrink-0" aria-hidden />
            Hủy nhận bài
          </Button>
        </>
      )}
      {toModerationUiStatus(item.moderation?.status) === ModerationStatus.TEMPORARILY_REJECTED && (
        <p className="text-sm text-amber-200/95 bg-amber-900/40 rounded-xl px-4 py-2 border border-amber-600/50">
          Bạn cần phải chờ Người đóng góp hoàn tất chỉnh sửa bản thu thì bạn mới có thể tái kiểm
          duyệt bản thu.
        </p>
      )}
      {toModerationUiStatus(item.moderation?.status) === ModerationStatus.REJECTED && (
        <p className="text-sm text-red-200/95 bg-red-900/40 rounded-xl px-4 py-2 border border-red-600/50">
          Bản thu đã bị từ chối vĩnh viễn và không thể chỉnh sửa bởi bất kỳ ai.
        </p>
      )}
      {item.id && status !== ModerationStatus.APPROVED && (
        <Button
          type="button"
          onClick={() => item.id && onRequestDelete(item.id)}
          aria-label="Xóa bản thu khỏi hệ thống vĩnh viễn"
          variant="danger"
          className="inline-flex items-center gap-2 rounded-xl border border-red-600/60 focus-visible:ring-white focus-visible:ring-offset-neutral-800"
        >
          <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
          Xóa bản thu khỏi hệ thống
        </Button>
      )}
    </div>
  );
}

export default ModerationClaimActions;
