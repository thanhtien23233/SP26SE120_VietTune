import {
  deriveModerationStage,
  moderationStageLabelVi,
} from '@/features/moderation/constants/moderationStage';
import { VERIFICATION_STEPS } from '@/features/moderation/constants/verificationStepDefinitions';
import { countStepCompletion } from '@/features/moderation/utils/countStepCompletion';
import type { ModerationVerificationData } from '@/services/expertWorkflowService';

type StageStep = 1 | 2 | 3;

function toStageStep(step: number): StageStep {
  if (step === 2 || step === 3) return step;
  return 1;
}

export function ModerationStageProgressBar({
  currentStep,
  verificationData,
  compact = false,
}: {
  currentStep: number;
  verificationData?: ModerationVerificationData;
  compact?: boolean;
}) {
  const normalizedStep = toStageStep(currentStep);
  const stageVi = moderationStageLabelVi(deriveModerationStage(normalizedStep));
  const { done, total } = countStepCompletion(normalizedStep, verificationData);

  if (compact) {
    return (
      <div
        className="flex items-center gap-1.5"
        aria-label={`Tiến độ kiểm duyệt Review 3: ${stageVi}, bước ${normalizedStep} trên 3`}
      >
        {[1, 2, 3].map((step) => (
          <span
            key={step}
            title={`${moderationStageLabelVi(deriveModerationStage(step))} — ${VERIFICATION_STEPS[step - 1].wizardTitle}`}
            className={`h-2.5 w-2.5 rounded-full ${
              step < normalizedStep
                ? 'bg-green-500'
                : step === normalizedStep
                  ? 'bg-primary-600'
                  : 'bg-neutral-300'
            }`}
            aria-hidden
          />
        ))}
      </div>
    );
  }

  return (
    <section
      className="space-y-3"
      aria-label={`Tiến độ kiểm duyệt Review 3: ${stageVi}, bước ${normalizedStep} trên 3`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-neutral-900">
          {stageVi} — Bước {normalizedStep}/3 • {VERIFICATION_STEPS[normalizedStep - 1].wizardTitle}
        </p>
        <p className="text-xs text-neutral-600">
          Checklist: {done}/{total}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2" aria-hidden>
        {[1, 2, 3].map((step) => (
          <div key={step} className="space-y-1">
            <div
              className={`h-2 rounded-full ${
                step < normalizedStep
                  ? 'bg-green-500'
                  : step === normalizedStep
                    ? 'bg-primary-600'
                    : 'bg-neutral-200'
              }`}
            />
            <p className="truncate text-[11px] text-neutral-700" title={VERIFICATION_STEPS[step - 1].wizardTitle}>
              <span className="font-semibold text-neutral-800">
                {moderationStageLabelVi(deriveModerationStage(step))}
              </span>
              <span className="text-neutral-500"> • </span>
              <span className="text-neutral-600">{VERIFICATION_STEPS[step - 1].wizardTitle}</span>
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ModerationStageProgressBar;
