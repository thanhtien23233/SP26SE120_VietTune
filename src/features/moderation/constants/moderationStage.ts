/**
 * Review 3 expert workflow stages (SCREENING → VERIFICATION → PUBLICATION).
 * Maps 1:1 to wizard `verificationStep` 1..3 until backend sends an explicit `workflowStage`.
 */

export enum ModerationStage {
  SCREENING = 'SCREENING',
  VERIFICATION = 'VERIFICATION',
  PUBLICATION = 'PUBLICATION',
}

/** Wizard step index → Review 3 stage (default when BE does not send `workflowStage`). */
export const VERIFICATION_STEP_TO_MODERATION_STAGE: Record<1 | 2 | 3, ModerationStage> = {
  1: ModerationStage.SCREENING,
  2: ModerationStage.VERIFICATION,
  3: ModerationStage.PUBLICATION,
};

export function isModerationStage(value: unknown): value is ModerationStage {
  return (
    value === ModerationStage.SCREENING ||
    value === ModerationStage.VERIFICATION ||
    value === ModerationStage.PUBLICATION
  );
}

function parseWorkflowStage(raw: unknown): ModerationStage | undefined {
  if (raw === null || raw === undefined) return undefined;
  if (isModerationStage(raw)) return raw;
  if (typeof raw !== 'string') return undefined;
  const v = raw.trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (v === 'SCREENING' || v === 'STAGE_1' || v === 'STAGE1') return ModerationStage.SCREENING;
  if (v === 'VERIFICATION' || v === 'STAGE_2' || v === 'STAGE2') return ModerationStage.VERIFICATION;
  if (v === 'PUBLICATION' || v === 'STAGE_3' || v === 'STAGE3') return ModerationStage.PUBLICATION;
  return undefined;
}

/**
 * Resolve the expert moderation stage for UI.
 * Prefer explicit BE value when present; otherwise derive from `verificationStep` (1..3).
 */
export function deriveModerationStage(
  verificationStep?: number | null,
  explicitWorkflowStage?: ModerationStage | string | null,
): ModerationStage {
  const explicit = parseWorkflowStage(explicitWorkflowStage);
  if (explicit) return explicit;

  const step = verificationStep ?? 1;
  if (!Number.isFinite(step) || step <= 1) return ModerationStage.SCREENING;
  if (step === 2) return ModerationStage.VERIFICATION;
  return ModerationStage.PUBLICATION;
}

const VI_LABEL: Record<ModerationStage, string> = {
  [ModerationStage.SCREENING]: 'Sàng lọc',
  [ModerationStage.VERIFICATION]: 'Xác minh',
  [ModerationStage.PUBLICATION]: 'Phê duyệt',
};

/** Vietnamese short label for queue / filters (Review 3). */
export function moderationStageLabelVi(stage: ModerationStage): string {
  return VI_LABEL[stage];
}
