import { describe, expect, it } from 'vitest';

import {
  ModerationStage,
  VERIFICATION_STEP_TO_MODERATION_STAGE,
  deriveModerationStage,
  isModerationStage,
  moderationStageLabelVi,
} from '@/features/moderation/constants/moderationStage';

describe('moderationStage', () => {
  it('maps verification steps to stages', () => {
    expect(VERIFICATION_STEP_TO_MODERATION_STAGE[1]).toBe(ModerationStage.SCREENING);
    expect(VERIFICATION_STEP_TO_MODERATION_STAGE[2]).toBe(ModerationStage.VERIFICATION);
    expect(VERIFICATION_STEP_TO_MODERATION_STAGE[3]).toBe(ModerationStage.PUBLICATION);
  });

  it('deriveModerationStage defaults to SCREENING when step missing', () => {
    expect(deriveModerationStage(undefined)).toBe(ModerationStage.SCREENING);
    expect(deriveModerationStage(null)).toBe(ModerationStage.SCREENING);
  });

  it('deriveModerationStage follows verificationStep when no explicit workflow stage', () => {
    expect(deriveModerationStage(1)).toBe(ModerationStage.SCREENING);
    expect(deriveModerationStage(2)).toBe(ModerationStage.VERIFICATION);
    expect(deriveModerationStage(3)).toBe(ModerationStage.PUBLICATION);
    expect(deriveModerationStage(99)).toBe(ModerationStage.PUBLICATION);
  });

  it('deriveModerationStage treats non-positive steps as SCREENING', () => {
    expect(deriveModerationStage(0)).toBe(ModerationStage.SCREENING);
    expect(deriveModerationStage(-1)).toBe(ModerationStage.SCREENING);
    expect(deriveModerationStage(Number.NaN)).toBe(ModerationStage.SCREENING);
  });

  it('prefers explicit workflow stage when provided', () => {
    expect(deriveModerationStage(3, ModerationStage.SCREENING)).toBe(ModerationStage.SCREENING);
    expect(deriveModerationStage(1, 'verification')).toBe(ModerationStage.VERIFICATION);
    expect(deriveModerationStage(1, 'STAGE_3')).toBe(ModerationStage.PUBLICATION);
  });

  it('ignores invalid explicit workflow stage strings', () => {
    expect(deriveModerationStage(2, 'not-a-stage')).toBe(ModerationStage.VERIFICATION);
  });

  it('moderationStageLabelVi returns Vietnamese labels', () => {
    expect(moderationStageLabelVi(ModerationStage.SCREENING)).toBe('Sàng lọc');
    expect(moderationStageLabelVi(ModerationStage.VERIFICATION)).toBe('Xác minh');
    expect(moderationStageLabelVi(ModerationStage.PUBLICATION)).toBe('Phê duyệt');
  });

  it('isModerationStage accepts enum members and equivalent string literals', () => {
    expect(isModerationStage('SCREENING')).toBe(true);
    expect(isModerationStage(ModerationStage.SCREENING)).toBe(true);
    expect(isModerationStage('bogus')).toBe(false);
  });
});
