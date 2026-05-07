import { useCallback, useState } from 'react';

import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import { expertWorkflowService } from '@/services/expertWorkflowService';
import type { ModerationVerificationData } from '@/services/expertWorkflowService';
import { uiToast, resolveCatalogMessage } from '@/uiToast';

const STEP2_REQUIRED_LABELS: Record<
  'culturalValue' | 'authenticity' | 'accuracy' | 'instrumentsVerified',
  string
> = {
  culturalValue: 'Giá trị văn hóa',
  authenticity: 'Tính xác thực',
  accuracy: 'Độ chính xác',
  instrumentsVerified: 'Xác minh nhạc cụ',
};

function hasAllInstrumentDecisions(
  declaredInstruments: string[],
  overrides?: Record<string, 'confirmed' | 'rejected' | 'added'>,
): boolean {
  if (declaredInstruments.length === 0) return true;
  return declaredInstruments.every((name) => {
    const status = overrides?.[name];
    return status === 'confirmed' || status === 'rejected';
  });
}

export function getMissingStep2Fields(
  step2: ModerationVerificationData['step2'] | undefined,
  declaredInstruments: string[],
): string[] {
  const missing: string[] = [];
  if (!step2?.culturalValue) missing.push(STEP2_REQUIRED_LABELS.culturalValue);
  if (!step2?.authenticity) missing.push(STEP2_REQUIRED_LABELS.authenticity);
  if (!step2?.accuracy) missing.push(STEP2_REQUIRED_LABELS.accuracy);

  const instrumentsComplete = hasAllInstrumentDecisions(
    declaredInstruments,
    step2?.instrumentOverrides,
  );
  if (!instrumentsComplete && !step2?.instrumentsVerified) {
    missing.push(STEP2_REQUIRED_LABELS.instrumentsVerified);
  }

  return missing;
}

export function useModerationWizard(opts: {
  allItems: LocalRecordingMini[];
  userId: string | undefined;
  onRequireApproveConfirm: (submissionId: string) => void;
  onRequireStageTransitionConfirm: (payload: { submissionId: string; fromStep: 1 | 2 }) => void;
  load: () => Promise<void>;
}) {
  const { allItems, userId, onRequireApproveConfirm, onRequireStageTransitionConfirm, load } = opts;
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
        const declaredInstruments =
          allItems.find((x) => x.id === id)?.culturalContext?.instruments ?? [];
        return getMissingStep2Fields(step2, declaredInstruments).length === 0;
      }
      if (step === 3) {
        const step3 = formData.step3;
        return !!(step3?.crossChecked && step3?.sourcesVerified && step3?.finalApproval);
      }
      return false;
    },
    [allItems, verificationForms],
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

  const confirmStageTransition = useCallback(
    async (id: string, fromStep: 1 | 2) => {
      if (!id || !userId) return;
      const nextStep = fromStep + 1;
      setVerificationStep((prev) => ({ ...prev, [id]: nextStep }));

      const it = allItems.find((x) => x.id === id);
      if (it?.moderation?.claimedBy !== userId) return;
      const currentFormData = verificationForms[id] || {};
      const verificationData = {
        ...(it.moderation?.verificationData || {}),
        ...currentFormData,
      } as ModerationVerificationData;

      if (fromStep === 1) {
        const stageOneResult = await expertWorkflowService.completeStageOne(id);
        if (!stageOneResult.ok) {
          setVerificationStep((prev) => ({ ...prev, [id]: fromStep }));
          uiToast.error('Không thể chuyển sang giai đoạn Xác minh. Vui lòng thử lại.');
          return;
        }
        await expertWorkflowService.logExpertModerationDecision({
          submissionId: id,
          userId,
          action: 'expert_complete_stage_one',
          combinedNotes: `Hoàn tất giai đoạn Sàng lọc (bước 1) lúc ${new Date().toISOString()}.`,
        });
      }

      if (fromStep === 2) {
        const stageTwoResult = await expertWorkflowService.completeStageTwo(id);
        if (!stageTwoResult.ok) {
          setVerificationStep((prev) => ({ ...prev, [id]: fromStep }));
          uiToast.error('Không thể chuyển sang giai đoạn Xuất bản. Vui lòng thử lại.');
          return;
        }
        await expertWorkflowService.logExpertModerationDecision({
          submissionId: id,
          userId,
          action: 'expert_complete_stage_two',
          combinedNotes: `Hoàn tất giai đoạn Xác minh (bước 2) lúc ${new Date().toISOString()}.`,
        });
      }

      const ok = await expertWorkflowService.updateVerificationStep(id, {
        verificationStep: nextStep,
        verificationData,
      });
      if (!ok) {
        setVerificationStep((prev) => ({ ...prev, [id]: fromStep }));
        uiToast.error('Không thể lưu trạng thái bước kiểm duyệt. Vui lòng thử lại.');
        return;
      }
      await load();
    },
    [allItems, load, userId, verificationForms],
  );

  const nextVerificationStep = useCallback(
    async (id?: string) => {
      if (!id || !userId) return;
      const currentStep = getCurrentVerificationStep(id);

      if (currentStep < 3) {
        if (!validateStep(id, currentStep)) {
          if (currentStep === 2) {
            const step2 = verificationForms[id]?.step2;
            const declaredInstruments =
              allItems.find((x) => x.id === id)?.culturalContext?.instruments ?? [];
            const missing = getMissingStep2Fields(step2, declaredInstruments);
            if (missing.length > 0) {
              uiToast.warning(`Bạn còn thiếu: ${missing.join(', ')}`);
              return;
            }
          }
          uiToast.warning(
            resolveCatalogMessage('moderation.wizard.step_incomplete', { step: currentStep }),
          );
          return;
        }
        if (currentStep === 1 || currentStep === 2) {
          onRequireStageTransitionConfirm({ submissionId: id, fromStep: currentStep });
          return;
        }
      }

      if (currentStep < 3) return;

      if (!validateStep(id, currentStep)) {
        if (currentStep === 2) {
          const step2 = verificationForms[id]?.step2;
          const declaredInstruments =
            allItems.find((x) => x.id === id)?.culturalContext?.instruments ?? [];
          const missing = getMissingStep2Fields(step2, declaredInstruments);
          if (missing.length > 0) {
            uiToast.warning(`Bạn còn thiếu: ${missing.join(', ')}`);
            return;
          }
        }
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
      onRequireApproveConfirm,
      onRequireStageTransitionConfirm,
      userId,
      validateStep,
      verificationForms,
    ],
  );

  const updateVerificationForm = useCallback(
    (id: string | null, step: number, field: string, value: unknown) => {
      if (!id) return;
      setVerificationForms((prev) => {
        const current = prev[id] || {};
        const stepData =
          (current[`step${step}` as keyof ModerationVerificationData] as Record<string, unknown>) ||
          {};
        const nextStepData = {
          ...stepData,
          [field]: value,
          completedAt: new Date().toISOString(),
        } as Record<string, unknown>;

        if (step === 2 && field === 'instrumentOverrides') {
          const declaredInstruments =
            allItems.find((x) => x.id === id)?.culturalContext?.instruments ?? [];
          const overrides = value as Record<string, 'confirmed' | 'rejected' | 'added'>;
          if (hasAllInstrumentDecisions(declaredInstruments, overrides)) {
            nextStepData.instrumentsVerified = true;
          }
        }

        return {
          ...prev,
          [id]: {
            ...current,
            [`step${step}`]: {
              ...nextStepData,
            },
          },
        };
      });
    },
    [allItems],
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
    confirmStageTransition,
    updateVerificationForm,
  };
}
