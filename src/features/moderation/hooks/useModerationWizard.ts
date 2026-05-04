import { useCallback, useState } from 'react';

import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import { expertWorkflowService } from '@/services/expertWorkflowService';
import type { ModerationVerificationData } from '@/services/expertWorkflowService';
import { uiToast, resolveCatalogMessage } from '@/uiToast';

export function useModerationWizard(opts: {
  allItems: LocalRecordingMini[];
  userId: string | undefined;
  onRequireApproveConfirm: (submissionId: string) => void;
  load: () => Promise<void>;
}) {
  const { allItems, userId, onRequireApproveConfirm, load } = opts;
  const [verificationStep, setVerificationStep] = useState<Record<string, number>>({});
  const [verificationForms, setVerificationForms] = useState<
    Record<string, ModerationVerificationData>
  >({});

  const primeClaimState = useCallback(
    (submissionId: string, moderationData?: ModerationVerificationData) => {
      setVerificationStep((prev) => ({ ...prev, [submissionId]: 1 }));
      if (moderationData) {
        setVerificationForms((prev) => ({
          ...prev,
          [submissionId]: moderationData,
        }));
      }
    },
    [],
  );

  const validateStep = useCallback(
    (id: string | null, step: number): boolean => {
      if (!id) return false;
      const formData = verificationForms[id];
      if (!formData) return false;

      if (step === 1) {
        const step1 = formData.step1;
        return !!(step1?.infoComplete && step1?.infoAccurate && step1?.formatCorrect);
      }
      if (step === 2) {
        const step2 = formData.step2;
        return !!(step2?.culturalValue && step2?.authenticity && step2?.accuracy);
      }
      if (step === 3) {
        const step3 = formData.step3;
        return !!(step3?.crossChecked && step3?.sourcesVerified && step3?.finalApproval);
      }
      return false;
    },
    [verificationForms],
  );

  const allVerificationStepsComplete = useCallback(
    (id: string | null): boolean => {
      if (!id) return false;
      return validateStep(id, 1) && validateStep(id, 2) && validateStep(id, 3);
    },
    [validateStep],
  );

  const getCurrentVerificationStep = useCallback(
    (id: string | null): number => {
      if (!id) return 1;
      const item = allItems.find((it) => it.id === id);
      return verificationStep[id] || item?.moderation?.verificationStep || 1;
    },
    [allItems, verificationStep],
  );

  const prevVerificationStep = useCallback(
    async (id?: string) => {
      if (!id || !userId) return;
      const currentStep = getCurrentVerificationStep(id);
      if (currentStep <= 1) return;

      const prevStep = currentStep - 1;
      setVerificationStep((prev) => ({ ...prev, [id]: prevStep }));

      const it = allItems.find((x) => x.id === id);
      if (it?.moderation?.claimedBy !== userId) return;
      const currentFormData = verificationForms[id] || {};
      const verificationData = {
        ...(it.moderation?.verificationData || {}),
        ...currentFormData,
      } as ModerationVerificationData;
      const ok = await expertWorkflowService.updateVerificationStep(id, {
        verificationStep: prevStep,
        verificationData,
      });
      if (ok) await load();
    },
    [allItems, getCurrentVerificationStep, load, userId, verificationForms],
  );

  const nextVerificationStep = useCallback(
    async (id?: string) => {
      if (!id || !userId) return;
      const currentStep = getCurrentVerificationStep(id);

      if (currentStep < 3) {
        const nextStep = currentStep + 1;
        setVerificationStep((prev) => ({ ...prev, [id]: nextStep }));

        const it = allItems.find((x) => x.id === id);
        if (it?.moderation?.claimedBy !== userId) return;
        const currentFormData = verificationForms[id] || {};
        const verificationData = {
          ...(it.moderation?.verificationData || {}),
          ...currentFormData,
        } as ModerationVerificationData;
        const ok = await expertWorkflowService.updateVerificationStep(id, {
          verificationStep: nextStep,
          verificationData,
        });
        if (ok) await load();
        return;
      }

      if (!validateStep(id, currentStep)) {
        uiToast.warning(
          resolveCatalogMessage('moderation.wizard.step_incomplete', { step: currentStep }),
        );
        return;
      }
      uiToast.info('moderation.wizard.ready_for_approve');
      onRequireApproveConfirm(id);
    },
    [
      allItems,
      getCurrentVerificationStep,
      load,
      onRequireApproveConfirm,
      userId,
      validateStep,
      verificationForms,
    ],
  );

  const updateVerificationForm = useCallback(
    (id: string | null, step: number, field: string, value: boolean | string) => {
      if (!id) return;
      setVerificationForms((prev) => {
        const current = prev[id] || {};
        const stepData = current[`step${step}` as keyof ModerationVerificationData] || {};
        return {
          ...prev,
          [id]: {
            ...current,
            [`step${step}`]: {
              ...stepData,
              [field]: value,
              completedAt: new Date().toISOString(),
            },
          },
        };
      });
    },
    [],
  );

  return {
    verificationStep,
    setVerificationStep,
    verificationForms,
    setVerificationForms,
    primeClaimState,
    validateStep,
    allVerificationStepsComplete,
    getCurrentVerificationStep,
    prevVerificationStep,
    nextVerificationStep,
    updateVerificationForm,
  };
}
