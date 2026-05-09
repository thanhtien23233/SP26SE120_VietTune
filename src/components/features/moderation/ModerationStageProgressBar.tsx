import {
  deriveModerationStage,
  moderationStageLabelVi,
} from '@/features/moderation/constants/moderationStage';
import { VERIFICATION_STEPS } from '@/features/moderation/constants/verificationStepDefinitions';
import {
  aggregateChecklistCompletion,
  deriveVerificationUiProgress,
} from '@/features/moderation/utils/deriveVerificationUiProgress';
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
  const uiProgress = verificationData ? deriveVerificationUiProgress(verificationData) : null;
  const visualStep = uiProgress?.mode === 'in_progress' ? uiProgress.step : normalizedStep;
  const stageVi = moderationStageLabelVi(deriveModerationStage(visualStep));
  const checklist = verificationData
    ? aggregateChecklistCompletion(verificationData)
    : aggregateChecklistCompletion(undefined);
  const isAllComplete = uiProgress?.mode === 'all_complete';

  const getStepClass = (step: number): string => {
    if (isAllComplete) return 'bg-green-500';
    if (step < visualStep) return 'bg-green-500';
    if (step === visualStep) return 'bg-primary-600';
    return compact ? 'bg-neutral-300' : 'bg-neutral-200';
  };

  if (compact) {
    return (
      <div
        className="flex items-center gap-1.5"
        aria-label={`Tiến độ kiểm duyệt Review 3: ${stageVi}, bước ${visualStep} trên 3`}
      >
        {[1, 2, 3].map((step) => (
          <span
            key={step}
            title={`${moderationStageLabelVi(deriveModerationStage(step))} — ${VERIFICATION_STEPS[step - 1].wizardTitle}`}
            className={`h-2.5 w-2.5 rounded-full ${getStepClass(step)}`}
            aria-hidden
          />
        ))}
      </div>
    );
  }

  return (
    <section
      className="space-y-3"
      aria-label={`Tiến độ kiểm duyệt Review 3: ${stageVi}, bước ${visualStep} trên 3`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-neutral-900">
          {isAllComplete
            ? 'Đã hoàn tất checklist 3 bước'
            : `${stageVi} — Bước ${visualStep}/3 • ${VERIFICATION_STEPS[visualStep - 1].wizardTitle}`}
        </p>
        <p className="text-xs text-neutral-600">
          Checklist: {checklist.done}/{checklist.total}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2" aria-hidden>
        {[1, 2, 3].map((step) => (
          <div key={step} className="space-y-1">
            <div className={`h-2 rounded-full ${getStepClass(step)}`} />
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
