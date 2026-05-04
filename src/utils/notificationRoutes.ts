import type { AppNotification } from '@/types';

export function getNotificationTargetPath(
  n: Pick<AppNotification, 'type' | 'recordingId'>,
): string {
  const rid = n.recordingId?.trim();
  const hasRecording = Boolean(rid);

  switch (n.type) {
    case 'submission_pending_review':
    case 'submission_updated':
      return '/moderation';

    case 'submission_approved':
    case 'embargo_lifted':
    case 'recording_edited':
      return hasRecording ? `/recordings/${encodeURIComponent(rid!)}` : '/contributions';

    case 'submission_rejected':
    case 'recording_deleted':
    case 'edit_submission_approved':
    case 'edit_request_approved':
    case 'delete_request_rejected':
    case 'dispute_resolved':
      return '/contributions';

    case 'delete_request_forwarded':
      return '/approved-recordings';

    case 'expert_account_deletion_approved':
    case 'role_changed':
    case 'account_deactivated':
      return '/profile';

    case 'expert_deletion_requested':
      return '/admin';

    case 'submission_claimed':
    case 'submission_unassigned':
      return '/moderation';

    case 'account_activated':
      return '/profile';

    default:
      return '/notifications';
  }
}
