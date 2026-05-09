import { describe, expect, it } from 'vitest';

import {
  aggregateChecklistCompletion,
  deriveVerificationUiProgress,
} from './deriveVerificationUiProgress';

describe('deriveVerificationUiProgress', () => {
  it('returns first incomplete step when some checklist fields are missing', () => {
    const data = {
      step1: { infoComplete: true, infoAccurate: true, formatCorrect: true },
      step2: { culturalValue: true, authenticity: false, accuracy: false, instrumentsVerified: false },
      step3: { crossChecked: false, sourcesVerified: false, finalApproval: false },
    };
    expect(deriveVerificationUiProgress(data)).toEqual({ mode: 'in_progress', step: 2 });
  });

  it('returns all_complete when all required checklist fields are done', () => {
    const data = {
      step1: { infoComplete: true, infoAccurate: true, formatCorrect: true },
      step2: { culturalValue: true, authenticity: true, accuracy: true, instrumentsVerified: true },
      step3: { crossChecked: true, sourcesVerified: true, finalApproval: true },
    };
    expect(deriveVerificationUiProgress(data)).toEqual({ mode: 'all_complete' });
  });
});

describe('aggregateChecklistCompletion', () => {
  it('returns 0/10 for empty verification data', () => {
    expect(aggregateChecklistCompletion(undefined)).toEqual({ done: 0, total: 10 });
  });

  it('sums done/total across all 3 steps', () => {
    const data = {
      step1: { infoComplete: true, infoAccurate: true, formatCorrect: true },
      step2: { culturalValue: true, authenticity: true, accuracy: false, instrumentsVerified: false },
      step3: { crossChecked: true, sourcesVerified: false, finalApproval: false },
    };
    expect(aggregateChecklistCompletion(data)).toEqual({ done: 6, total: 10 });
  });
});

