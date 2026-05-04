const BE_TO_FE_TYPE: Record<string, string> = {
  SubmissionApproved: 'submission_approved',
  SubmissionRejected: 'submission_rejected',
  SubmissionAssigned: 'submission_claimed',
  SubmissionUnassigned: 'submission_unassigned',
  NewRecordingPending: 'submission_pending_review',
  RoleChanged: 'role_changed',
  AccountDeactivated: 'account_deactivated',
  AccountActivated: 'account_activated',
  EmbargoLifted: 'embargo_lifted',
  DisputeResolved: 'dispute_resolved',
};

export function normalizeBENotificationType(beType: string): string {
  if (!beType) return beType;
  return BE_TO_FE_TYPE[beType] ?? beType;
}
