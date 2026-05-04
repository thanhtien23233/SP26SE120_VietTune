import type { Ref, RefObject } from 'react';

import { ModerationModals, type ModerationPortalModal } from '@/components/features/moderation/ModerationModals';
import { ModerationRejectReasonFormPortal } from '@/components/features/moderation/ModerationRejectReasonForm';
import { ModerationVerificationWizardDialog } from '@/components/features/moderation/ModerationVerificationWizardDialog';
import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import type { ModerationVerificationData } from '@/services/expertWorkflowService';

export interface ModerationPageDialogsProps {
  showVerificationDialog: string | null;
  dialogCurrentRecording: LocalRecordingMini | null;
  allItems: LocalRecordingMini[];
  verificationDialogPanelRef: RefObject<HTMLDivElement | null> | Ref<HTMLDivElement>;
  expertReviewNotesDraft: Record<string, string>;
  verificationForms: Record<string, ModerationVerificationData | undefined>;
  onExpertReviewNotesChange: (submissionId: string, text: string) => void;
  onCancelVerification: (id: string) => void;
  onUnclaimFromWizard: () => void;
  onOpenRejectFromWizard: () => void;
  getCurrentVerificationStep: (submissionId: string) => number;
  prevVerificationStep: (submissionId: string) => void;
  nextVerificationStep: (submissionId: string) => void;
  validateStep: (submissionId: string, step: number) => boolean;
  allVerificationStepsComplete: (submissionId: string) => boolean;
  updateVerificationForm: (
    id: string | null,
    step: number,
    field: string,
    value: boolean | string,
  ) => void;

  showRejectDialog: string | null;
  rejectType: 'direct' | 'temporary';
  onRejectTypeChange: (v: 'direct' | 'temporary') => void;
  rejectNote: string;
  onRejectNoteChange: (v: string) => void;
  onRejectCancel: () => void;
  onRejectFormConfirm: () => void;

  portalModal: ModerationPortalModal;
  onDismissPortalModal: (previous: NonNullable<ModerationPortalModal>) => void;
  approveExpertNotes: string;
  onApproveExpertNotesChange: (v: string) => void;
  rejectConfirmExpertNotes: string;
  onRejectConfirmExpertNotesChange: (v: string) => void;
  deleteRecordingTitle: string;
  onConfirmUnclaim: () => void;
  onConfirmApprove: () => void;
  onConfirmReject: () => void;
  onConfirmDelete: () => void;
}

/**
 * Verification wizard, reject-reason portal, and confirmation modals for the expert moderation page.
 * State and effects stay on `ModerationPage`; this component is presentation + wiring only.
 */
export default function ModerationPageDialogs({
  showVerificationDialog,
  dialogCurrentRecording,
  allItems,
  verificationDialogPanelRef,
  expertReviewNotesDraft,
  verificationForms,
  onExpertReviewNotesChange,
  onCancelVerification,
  onUnclaimFromWizard,
  onOpenRejectFromWizard,
  getCurrentVerificationStep,
  prevVerificationStep,
  nextVerificationStep,
  validateStep,
  allVerificationStepsComplete,
  updateVerificationForm,
  showRejectDialog,
  rejectType,
  onRejectTypeChange,
  rejectNote,
  onRejectNoteChange,
  onRejectCancel,
  onRejectFormConfirm,
  portalModal,
  onDismissPortalModal,
  approveExpertNotes,
  onApproveExpertNotesChange,
  rejectConfirmExpertNotes,
  onRejectConfirmExpertNotesChange,
  deleteRecordingTitle,
  onConfirmUnclaim,
  onConfirmApprove,
  onConfirmReject,
  onConfirmDelete,
}: ModerationPageDialogsProps) {
  const verificationWizard =
    showVerificationDialog &&
    (() => {
      const item =
        dialogCurrentRecording?.id === showVerificationDialog
          ? dialogCurrentRecording
          : allItems.find((it) => it.id === showVerificationDialog);
      if (!item) return null;
      const sid = showVerificationDialog;
      const currentStep = getCurrentVerificationStep(sid);
      return (
        <ModerationVerificationWizardDialog
          submissionId={sid}
          item={item}
          panelRef={verificationDialogPanelRef as Ref<HTMLDivElement>}
          expertReviewNotesDraft={expertReviewNotesDraft[sid] ?? ''}
          onExpertReviewNotesChange={(text) => onExpertReviewNotesChange(sid, text)}
          formSlice={verificationForms[sid]}
          currentStep={currentStep}
          onClose={() => onCancelVerification(sid)}
          onUnclaim={onUnclaimFromWizard}
          onOpenReject={onOpenRejectFromWizard}
          onPrevStep={() => prevVerificationStep(sid)}
          onNextStep={() => nextVerificationStep(sid)}
          onCompleteFinalStep={() => nextVerificationStep(sid)}
          isCurrentStepValid={validateStep(sid, currentStep)}
          allStepsComplete={allVerificationStepsComplete(sid)}
          onUpdateVerificationForm={(step, field, value) =>
            updateVerificationForm(sid, step, field, value)
          }
        />
      );
    })();

  return (
    <>
      {verificationWizard}

      <ModerationRejectReasonFormPortal
        submissionId={showRejectDialog}
        rejectType={rejectType}
        onRejectTypeChange={onRejectTypeChange}
        rejectNote={rejectNote}
        onRejectNoteChange={onRejectNoteChange}
        onCancel={onRejectCancel}
        onConfirm={onRejectFormConfirm}
      />

      <ModerationModals
        modal={portalModal}
        onDismiss={onDismissPortalModal}
        approveExpertNotes={approveExpertNotes}
        onApproveExpertNotesChange={onApproveExpertNotesChange}
        rejectConfirmExpertNotes={rejectConfirmExpertNotes}
        onRejectConfirmExpertNotesChange={onRejectConfirmExpertNotesChange}
        rejectType={rejectType}
        deleteRecordingTitle={deleteRecordingTitle}
        onConfirmUnclaim={onConfirmUnclaim}
        onConfirmApprove={onConfirmApprove}
        onConfirmReject={onConfirmReject}
        onConfirmDelete={onConfirmDelete}
      />
    </>
  );
}
