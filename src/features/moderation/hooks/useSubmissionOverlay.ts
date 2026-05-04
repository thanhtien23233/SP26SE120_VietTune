import { useCallback } from 'react';

import { expertWorkflowService } from '@/services/expertWorkflowService';
import type { LocalRecording } from '@/types';

/**
 * Phase 2.3: keep claim/unclaim locking invariant behind overlay service.
 * UI should call these wrappers instead of touching lock state directly.
 */
export function useSubmissionOverlay() {
  const claimSubmission = useCallback(
    (submissionId: string, userId: string, username: string) =>
      expertWorkflowService.claimSubmission(submissionId, userId, username),
    [],
  );

  const unclaimSubmission = useCallback(
    (submissionId: string) => expertWorkflowService.unclaimSubmission(submissionId),
    [],
  );

  const applyOverlayToRecording = useCallback(
    (recording: LocalRecording) => expertWorkflowService.applyOverlayToRecording(recording),
    [],
  );

  return {
    claimSubmission,
    unclaimSubmission,
    applyOverlayToRecording,
  };
}
