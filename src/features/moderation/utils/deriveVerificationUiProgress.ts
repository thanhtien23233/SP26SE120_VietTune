import { countStepCompletion } from '@/features/moderation/utils/countStepCompletion';
import type { ModerationVerificationData } from '@/services/expertWorkflowService';

type StageStep = 1 | 2 | 3;

export type VerificationUiProgress =
  | { mode: 'in_progress'; step: StageStep }
  | { mode: 'all_complete' };

export function deriveVerificationUiProgress(
  data?: ModerationVerificationData,
): VerificationUiProgress {
  for (const step of [1, 2, 3] as const) {
    const { done, total } = countStepCompletion(step, data);
    if (total > 0 && done < total) {
      return { mode: 'in_progress', step };
    }
  }
  return { mode: 'all_complete' };
}

export function aggregateChecklistCompletion(
  data?: ModerationVerificationData,
): { done: number; total: number } {
  return ([1, 2, 3] as const).reduce(
    (acc, step) => {
      const { done, total } = countStepCompletion(step, data);
      return { done: acc.done + done, total: acc.total + total };
    },
    { done: 0, total: 0 },
  );
}

