import { ChevronDown, ChevronRight } from 'lucide-react';
import { memo, useMemo, useState } from 'react';

import { buildModerationChecklistConfig } from '@/features/moderation/utils/moderationChecklistConfig';
import type { ModerationVerificationData } from '@/services/expertWorkflowService';

type StageStep = 1 | 2 | 3;

function toStageStep(step: number): StageStep {
  if (step === 2 || step === 3) return step;
  return 1;
}

export type ChecklistStageVisualState = 'completed' | 'in_progress' | 'pending';

function deriveVisualState(done: number, total: number): ChecklistStageVisualState {
  if (total === 0) return 'pending';
  if (done === total) return 'completed';
  if (done === 0) return 'pending';
  return 'in_progress';
}

function StateGlyph({ state }: { state: ChecklistStageVisualState }) {
  if (state === 'completed') {
    return (
      <span className="text-green-600" title="Hoàn thành" aria-label="Hoàn thành">
        ✓
      </span>
    );
  }
  if (state === 'in_progress') {
    return (
      <span className="text-amber-600" title="Đang làm" aria-label="Đang làm">
        ⚠
      </span>
    );
  }
  return (
    <span className="text-neutral-400" title="Chưa làm" aria-label="Chưa làm">
      ○
    </span>
  );
}

export const ModerationStageChecklistPreview = memo(function ModerationStageChecklistPreview({
  verificationData,
  currentStep,
}: {
  verificationData?: ModerationVerificationData;
  currentStep: number;
}) {
  const normalizedStep = toStageStep(currentStep);
  const stages = useMemo(() => buildModerationChecklistConfig(verificationData), [verificationData]);
  const [expanded, setExpanded] = useState<Record<StageStep, boolean>>({
    1: false,
    2: false,
    3: false,
  });

  return (
    <section aria-label="Tóm tắt checklist kiểm duyệt" className="space-y-2">
      {stages.map((stage) => {
        const done = stage.fields.filter((f) => f.checked).length;
        const total = stage.fields.length;
        const visual = deriveVisualState(done, total);
        const isCurrent = stage.step === normalizedStep;
        const isOpen = expanded[stage.step];

        return (
          <article
            key={stage.step}
            className={`rounded-lg border transition-colors ${
              isCurrent
                ? 'border-primary-300/80 bg-primary-50/40 ring-1 ring-primary-200/60'
                : visual === 'completed'
                  ? 'border-green-200/80 bg-green-50/30'
                  : 'border-neutral-200/90 bg-white/90'
            }`}
          >
            <button
              type="button"
              onClick={() =>
                setExpanded((prev) => ({
                  ...prev,
                  [stage.step]: !prev[stage.step],
                }))
              }
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-white/60"
              aria-expanded={isOpen}
              aria-controls={`moderation-checklist-preview-${stage.step}`}
            >
              <span className="flex w-5 shrink-0 justify-center text-sm font-semibold" aria-hidden>
                <StateGlyph state={visual} />
              </span>
              {isOpen ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0 text-neutral-500" aria-hidden />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-neutral-500" aria-hidden />
              )}
              <span className="min-w-0 flex-1 text-xs font-semibold text-neutral-900">
                Bước {stage.step}: {stage.title}
              </span>
              <span className="shrink-0 text-[11px] tabular-nums text-neutral-500">
                {done}/{total}
              </span>
            </button>
            {isOpen && (
              <div
                id={`moderation-checklist-preview-${stage.step}`}
                className="border-t border-neutral-100 px-3 pb-2 pt-1"
              >
                <ul className="space-y-1.5">
                  {stage.fields.map((field) => (
                    <li key={field.key} className="flex items-start gap-2 text-[11px] text-neutral-700">
                      <input
                        type="checkbox"
                        checked={field.checked}
                        readOnly
                        tabIndex={-1}
                        aria-hidden
                        className="mt-0.5 h-3.5 w-3.5 rounded border-neutral-300 accent-primary-600 pointer-events-none"
                      />
                      <span>{field.label}</span>
                    </li>
                  ))}
                </ul>
                {stage.step === normalizedStep && (
                  <p className="mt-2 text-[11px] text-neutral-500">
                    Chỉ xem. Mở wizard để cập nhật checklist.
                  </p>
                )}
              </div>
            )}
          </article>
        );
      })}
    </section>
  );
});

export default ModerationStageChecklistPreview;
