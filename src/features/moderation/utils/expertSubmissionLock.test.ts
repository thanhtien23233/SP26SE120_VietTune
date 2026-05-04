import { describe, expect, it } from 'vitest';

import { isLockedToAnotherExpert } from './expertSubmissionLock';

describe('isLockedToAnotherExpert', () => {
  const me = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const other = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

  it('returns false when no lock', () => {
    expect(isLockedToAnotherExpert({ status: 0 }, me)).toBe(false);
    expect(isLockedToAnotherExpert({}, me)).toBe(false);
  });

  it('returns true when claimedBy is another expert', () => {
    expect(isLockedToAnotherExpert({ claimedBy: other, status: 1 }, me)).toBe(true);
  });

  it('returns false when claimedBy is self', () => {
    expect(isLockedToAnotherExpert({ claimedBy: me }, me)).toBe(false);
  });

  it('returns true when reviewerId is another expert (PENDING + server assign)', () => {
    expect(isLockedToAnotherExpert({ reviewerId: other, status: 0 }, me)).toBe(true);
  });

  it('returns false when reviewerId is self', () => {
    expect(isLockedToAnotherExpert({ reviewerId: me, status: 0 }, me)).toBe(false);
  });
});
