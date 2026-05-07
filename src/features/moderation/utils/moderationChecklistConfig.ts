import { VERIFICATION_STEPS } from '@/features/moderation/constants/verificationStepDefinitions';
import type { ModerationVerificationData } from '@/services/expertWorkflowService';

export type ModerationChecklistStageStep = 1 | 2 | 3;

export type ModerationChecklistStageField = {
  key: string;
  label: string;
  checked: boolean;
};

export type ModerationChecklistStageConfig = {
  step: ModerationChecklistStageStep;
  title: string;
  fields: ModerationChecklistStageField[];
};

export function buildModerationChecklistConfig(
  data?: ModerationVerificationData,
): ModerationChecklistStageConfig[] {
  return VERIFICATION_STEPS.map((stepDef) => {
    const stepData =
      stepDef.step === 1 ? data?.step1 : stepDef.step === 2 ? data?.step2 : data?.step3;
    return {
      step: stepDef.step,
      title: stepDef.name,
      fields: stepDef.fields.map((field) => ({
        key: field.key,
        label: field.label,
        checked: !!(stepData as Record<string, unknown> | undefined)?.[field.key],
      })),
    };
  });
}
