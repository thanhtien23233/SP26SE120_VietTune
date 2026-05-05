import { VERIFICATION_STEPS } from '@/features/moderation/constants/verificationStepDefinitions';
import type { ModerationVerificationData } from '@/services/expertWorkflowService';

type StageStep = 1 | 2 | 3;

function toStageStep(step: number): StageStep {
  if (step === 2 || step === 3) return step;
  return 1;
}

export function countStepCompletion(
  step: number,
  data?: ModerationVerificationData,
): { done: number; total: number } {
  const normalizedStep = toStageStep(step);
  const stepDef = VERIFICATION_STEPS[normalizedStep - 1];
  const keys = stepDef.fields.map((field) => field.key);
  const stepData =
    normalizedStep === 1 ? data?.step1 : normalizedStep === 2 ? data?.step2 : data?.step3;
  const done = keys.reduce(
    (acc, key) => ((stepData as Record<string, unknown> | undefined)?.[key] ? acc + 1 : acc),
    0,
  );
  return { done, total: keys.length };
}
