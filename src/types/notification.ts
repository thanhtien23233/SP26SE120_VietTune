import type { UserRole } from '@/types/user';

export interface ExpertAccountDeletionRequest {
  expertId: string;
  expertUsername: string;
  expertFullName?: string;
  requestedAt: string;
}

export interface DeleteRecordingRequest {
  id: string;
  recordingId: string;
  recordingTitle: string;
  contributorId: string;
  contributorName: string;
  requestedAt: string;
  status: 'pending_admin' | 'forwarded_to_expert';
  forwardedToExpertId?: string;
  forwardedAt?: string;
}

export interface EditRecordingRequest {
  id: string;
  recordingId: string;
  recordingTitle: string;
  contributorId: string;
  contributorName: string;
  requestedAt: string;
  status: 'pending' | 'approved';
  approvedAt?: string;
}

export interface EditSubmissionForReview {
  id: string;
  recordingId: string;
  recordingTitle: string;
  contributorId: string;
  contributorName: string;
  submittedAt: string;
}

export interface AppNotification {
  id: string;
  type:
    | 'recording_deleted'
    | 'recording_edited'
    | 'expert_account_deletion_approved'
    | 'delete_request_rejected'
    | 'edit_submission_approved'
    | 'submission_pending_review'
    | 'submission_approved'
    | 'submission_rejected'
    | 'submission_updated'
    | 'delete_request_forwarded'
    | 'edit_request_approved'
    | 'role_changed'
    | 'account_deactivated'
    | 'dispute_resolved'
    | 'embargo_lifted'
    | 'expert_deletion_requested'
    | 'submission_claimed'
    | 'submission_unassigned'
    | 'account_activated';
  title: string;
  body: string;
  forRoles: UserRole[];
  recordingId?: string;
  createdAt: string;
  read?: boolean;
}
