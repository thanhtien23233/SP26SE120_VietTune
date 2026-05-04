import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import type { ModerationPortalModal } from '@/components/features/moderation/ModerationModals';
import { MODERATION_APPROVE_EXPERT_NOTES_MAX_LENGTH } from '@/config/validationConstants';
import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import { projectModerationLists } from '@/features/moderation/utils/expertQueueProjection';
import type { ModerationVerificationData } from '@/services/expertWorkflowService';
import { expertWorkflowService } from '@/services/expertWorkflowService';
import { ModerationStatus } from '@/types';
import { uiToast } from '@/uiToast';

export type ModerationExpertUser = { id: string; username?: string | null };

export type ConfirmModerationApproveParams = {
  submissionId: string;
  user: ModerationExpertUser;
  allItems: LocalRecordingMini[];
  verificationForms: Record<string, ModerationVerificationData>;
  approveExpertNotes: string;
  expertReviewNotesDraft: Record<string, string>;
  expertNotesDebounceRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  statusFilter: string;
  dateSort: 'newest' | 'oldest';
  setAllItems: Dispatch<SetStateAction<LocalRecordingMini[]>>;
  setItems: Dispatch<SetStateAction<LocalRecordingMini[]>>;
  setVerificationStep: Dispatch<SetStateAction<Record<string, number>>>;
  setVerificationForms: Dispatch<SetStateAction<Record<string, ModerationVerificationData>>>;
  setShowVerificationDialog: Dispatch<SetStateAction<string | null>>;
  setPortalModal: Dispatch<SetStateAction<ModerationPortalModal>>;
  setApproveExpertNotes: Dispatch<SetStateAction<string>>;
  setExpertReviewNotesDraft: Dispatch<SetStateAction<Record<string, string>>>;
  selectedId: string | null;
  setSelectedId: Dispatch<SetStateAction<string | null>>;
  load: () => Promise<void>;
};

export async function confirmModerationApprove(p: ConfirmModerationApproveParams): Promise<void> {
  const id = p.submissionId;
  const { user } = p;
  const it = p.allItems.find((x) => x.id === id);
  if (!it || it.moderation?.claimedBy !== user.id) return;

  const currentFormData = p.verificationForms[id] || {};
  const verificationData = {
    ...(it.moderation?.verificationData || {}),
    ...currentFormData,
  } as ModerationVerificationData;

  const trimmedApproveNotes = p.approveExpertNotes
    .trim()
    .slice(0, MODERATION_APPROVE_EXPERT_NOTES_MAX_LENGTH);
  if (p.expertNotesDebounceRef.current) {
    clearTimeout(p.expertNotesDebounceRef.current);
    p.expertNotesDebounceRef.current = null;
  }
  await expertWorkflowService.setExpertReviewNotes(id, p.expertReviewNotesDraft[id] ?? '');
  const sessionDraft = (p.expertReviewNotesDraft[id] ?? '').trim();
  const combinedApproveNotes = [sessionDraft, trimmedApproveNotes].filter(Boolean).join('\n\n');

  const overlaySnapshot = await expertWorkflowService.snapshotSubmissionOverlay(id);
  const reviewedAt = new Date().toISOString();
  const moderationApproved = {
    ...it.moderation,
    status: ModerationStatus.APPROVED,
    reviewerId: user.id,
    reviewerName: user.username ?? '',
    reviewedAt,
    claimedBy: null,
    claimedByName: null,
    claimedAt: null,
    verificationStep: undefined,
    verificationData: verificationData as ModerationVerificationData,
  } as NonNullable<LocalRecordingMini['moderation']>;
  if (combinedApproveNotes) moderationApproved.notes = combinedApproveNotes;
  else delete moderationApproved.notes;

  const optimisticItem: LocalRecordingMini = {
    ...it,
    resubmittedForModeration: false,
    moderation: moderationApproved,
  };

  try {
    await expertWorkflowService.commitApproveLocal(
      id,
      user.id,
      user.username ?? '',
      verificationData,
      combinedApproveNotes,
    );
  } catch {
    uiToast.error('moderation.approve.local_failed');
    return;
  }

  uiToast.success('moderation.approve.success');

  const nextExpert = p.allItems.map((x) => (x.id === id ? optimisticItem : x));
  const { expertItems, visibleItems } = projectModerationLists(
    nextExpert,
    user.id,
    p.statusFilter,
    p.dateSort,
  );
  p.setAllItems(expertItems);
  p.setItems(visibleItems);

  p.setApproveExpertNotes('');
  p.setVerificationStep((prev) => {
    const newState = { ...prev };
    delete newState[id];
    return newState;
  });
  p.setVerificationForms((prev) => {
    const newState = { ...prev };
    delete newState[id];
    return newState;
  });
  p.setShowVerificationDialog(null);
  p.setPortalModal(null);
  if (p.selectedId === id) p.setSelectedId(null);

  void (async () => {
    const syncRes = await expertWorkflowService.syncApproveToServer(id);
    if (!syncRes.ok) {
      console.warn('[moderationApproveReject] syncApproveToServer failed', syncRes.error);
      await expertWorkflowService.restoreSubmissionOverlay(id, overlaySnapshot);
      uiToast.error('moderation.approve.server_failed');
      await p.load();
      return;
    }
    await expertWorkflowService.logExpertModerationDecision({
      submissionId: id,
      userId: user.id,
      action: 'expert_approve',
      combinedNotes: combinedApproveNotes,
    });
    await expertWorkflowService.clearExpertReviewNotes(id);
    p.setExpertReviewNotesDraft((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    await p.load();
  })();
}

export type ExecuteModerationRejectParams = {
  id: string;
  user: ModerationExpertUser;
  type: 'direct' | 'temporary';
  note: string;
  confirmExpertNotes: string;
  allItems: LocalRecordingMini[];
  expertReviewNotesDraft: Record<string, string>;
  expertNotesDebounceRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  statusFilter: string;
  dateSort: 'newest' | 'oldest';
  setAllItems: Dispatch<SetStateAction<LocalRecordingMini[]>>;
  setItems: Dispatch<SetStateAction<LocalRecordingMini[]>>;
  setShowRejectDialog: Dispatch<SetStateAction<string | null>>;
  setRejectNote: Dispatch<SetStateAction<string>>;
  setRejectType: Dispatch<SetStateAction<'direct' | 'temporary'>>;
  setExpertReviewNotesDraft: Dispatch<SetStateAction<Record<string, string>>>;
  load: () => Promise<void>;
};

export async function executeModerationReject(p: ExecuteModerationRejectParams): Promise<boolean> {
  const { id, user, type } = p;
  const it = p.allItems.find((x) => x.id === id);
  if (!it) return false;
  if (it.moderation?.claimedBy !== user.id && it.moderation?.reviewerId !== user.id) {
    return false;
  }
  const expertNotesPayload = (p.confirmExpertNotes ?? '').trim() || (p.note ?? '').trim();
  if (!expertNotesPayload) {
    uiToast.warning('moderation.reject.notes_required');
    return false;
  }

  if (p.expertNotesDebounceRef.current) {
    clearTimeout(p.expertNotesDebounceRef.current);
    p.expertNotesDebounceRef.current = null;
  }
  await expertWorkflowService.setExpertReviewNotes(id, p.expertReviewNotesDraft[id] ?? '');
  const sessionRejectDraft = (p.expertReviewNotesDraft[id] ?? '').trim();
  const combinedRejectNotes = [sessionRejectDraft, expertNotesPayload].filter(Boolean).join('\n\n');

  const overlaySnapshot = await expertWorkflowService.snapshotSubmissionOverlay(id);
  const reviewedAt = new Date().toISOString();
  const nextStatus =
    type === 'direct' ? ModerationStatus.REJECTED : ModerationStatus.TEMPORARILY_REJECTED;
  const lockFromReject = type === 'direct' && it.resubmittedForModeration === true;
  const optimisticItem: LocalRecordingMini = {
    ...it,
    moderation: {
      ...it.moderation,
      status: nextStatus,
      reviewerId: user.id,
      reviewerName: user.username ?? '',
      reviewedAt,
      rejectionNote: p.note ?? '',
      contributorEditLocked: lockFromReject || it.moderation?.contributorEditLocked,
      claimedBy: null,
      claimedByName: null,
      notes: combinedRejectNotes,
    },
  };

  try {
    await expertWorkflowService.commitRejectLocal(
      id,
      user.id,
      user.username ?? '',
      type,
      p.note ?? '',
      combinedRejectNotes,
      {
        wasResubmitted: it.resubmittedForModeration === true,
      },
    );
  } catch {
    uiToast.error('moderation.reject.local_failed');
    return false;
  }

  const nextExpert = p.allItems.map((x) => (x.id === id ? optimisticItem : x));
  const { expertItems, visibleItems } = projectModerationLists(
    nextExpert,
    user.id,
    p.statusFilter,
    p.dateSort,
  );
  p.setAllItems(expertItems);
  p.setItems(visibleItems);

  p.setShowRejectDialog(null);
  p.setRejectNote('');
  p.setRejectType('direct');

  void (async () => {
    const syncRes = await expertWorkflowService.syncRejectToServer(id);
    if (!syncRes.ok) {
      console.warn('[moderationApproveReject] syncRejectToServer failed', syncRes.error);
      await expertWorkflowService.restoreSubmissionOverlay(id, overlaySnapshot);
      uiToast.error('moderation.reject.server_failed');
      await p.load();
      return;
    }
    await expertWorkflowService.logExpertModerationDecision({
      submissionId: id,
      userId: user.id,
      action: 'expert_reject',
      combinedNotes: combinedRejectNotes,
    });
    await expertWorkflowService.clearExpertReviewNotes(id);
    p.setExpertReviewNotesDraft((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    await p.load();
  })();
  return true;
}
