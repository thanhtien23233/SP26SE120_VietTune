import { CheckCircle2, ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';

import { VERIFICATION_STEPS } from '@/features/moderation/constants/verificationStepDefinitions';
import type { ModerationVerificationData } from '@/services/expertWorkflowService';

type StageStep = 1 | 2 | 3;

type StageField = {
  key: string;
  label: string;
  checked: boolean;
};

type StageChecklistConfig = {
  step: StageStep;
  title: string;
  fields: StageField[];
};

function toStageStep(step: number): StageStep {
  if (step === 2 || step === 3) return step;
  return 1;
}

function buildChecklistConfig(data?: ModerationVerificationData): StageChecklistConfig[] {
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

export function ModerationStageChecklist({
  verificationData,
  currentStep,
  defaultExpanded,
}: {
  verificationData?: ModerationVerificationData;
  currentStep: number;
  defaultExpanded?: boolean;
}) {
  const normalizedStep = toStageStep(currentStep);
  const checklist = useMemo(() => buildChecklistConfig(verificationData), [verificationData]);

  const [expanded, setExpanded] = useState<Record<StageStep, boolean>>({
    1: defaultExpanded === false ? false : normalizedStep === 1,
    2: defaultExpanded === false ? false : normalizedStep === 2,
    3: defaultExpanded === false ? false : normalizedStep === 3,
  });

  return (
    <section aria-label="Verification checklist summary" className="space-y-3">
      {checklist.map((stage) => {
        const doneCount = stage.fields.filter((field) => field.checked).length;
        const allDone = doneCount === stage.fields.length;
        const isOpen = expanded[stage.step];

        return (
          <article key={stage.step} className="rounded-xl border border-neutral-200 bg-white">
            <button
              type="button"
              onClick={() =>
                setExpanded((prev) => ({
                  ...prev,
                  [stage.step]: !prev[stage.step],
                }))
              }
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-neutral-50"
              aria-expanded={isOpen}
              aria-controls={`moderation-stage-checklist-${stage.step}`}
            >
              <span className="flex items-center gap-2">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-neutral-500" aria-hidden />
                ) : (
                  <ChevronRight className="h-4 w-4 text-neutral-500" aria-hidden />
                )}
                <span className="text-sm font-semibold text-neutral-900">
                  Stage {stage.step}: {stage.title}
                </span>
                {allDone && <CheckCircle2 className="h-4 w-4 text-green-600" aria-label="Completed stage" />}
              </span>
              <span className="text-xs text-neutral-600">
                {doneCount}/{stage.fields.length}
              </span>
            </button>

            {isOpen && (
              <div id={`moderation-stage-checklist-${stage.step}`} className="border-t border-neutral-100 px-4 py-3">
                <ul className="space-y-2">
                  {stage.fields.map((field) => (
                    <li key={field.key} className="flex items-start gap-2 text-sm text-neutral-700">
                      <input
                        type="checkbox"
                        checked={field.checked}
                        readOnly
                        tabIndex={-1}
                        aria-hidden
                        className="mt-0.5 h-4 w-4 rounded border-neutral-300 accent-primary-600 pointer-events-none"
                      />
                      <span>{field.label}</span>
                    </li>
                  ))}
                </ul>
                {stage.step === normalizedStep && (
                  <p className="mt-3 text-xs text-neutral-500">Chỉ xem. Mở wizard để cập nhật checklist.</p>
                )}
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
}

export default ModerationStageChecklist;
