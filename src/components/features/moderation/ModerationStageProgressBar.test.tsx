import { describe, expect, it } from 'vitest';

import { countStepCompletion } from '@/features/moderation/utils/countStepCompletion';
import type { ModerationVerificationData } from '@/services/expertWorkflowService';

describe('countStepCompletion', () => {
  it('returns 0/3 for step 1 when all required fields are false', () => {
    const data: ModerationVerificationData = {
      step1: { infoComplete: false, infoAccurate: false, formatCorrect: false },
    };
    expect(countStepCompletion(1, data)).toEqual({ done: 0, total: 3 });
  });

  it('returns 1/5 for step 2 when partially completed', () => {
    const data: ModerationVerificationData = {
      step2: {
        culturalValue: true,
        authenticity: false,
        accuracy: false,
        instrumentsVerified: false,
      },
    };
    expect(countStepCompletion(2, data)).toEqual({ done: 1, total: 5 });
  });

  it('returns 3/3 for step 3 when all required fields are true', () => {
    const data: ModerationVerificationData = {
      step3: {
        crossChecked: true,
        sourcesVerified: true,
        finalApproval: true,
        sensitiveContent: false,
      },
    };
    expect(countStepCompletion(3, data)).toEqual({ done: 3, total: 3 });
  });
});
