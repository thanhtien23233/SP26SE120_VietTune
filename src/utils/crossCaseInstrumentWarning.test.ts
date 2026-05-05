import { describe, expect, it } from 'vitest';

import { detectCrossCaseWarning } from '@/utils/crossCaseInstrumentWarning';

describe('detectCrossCaseWarning', () => {
  it('flags traditional song with modern instruments', () => {
    const result = detectCrossCaseWarning({
      instruments: ['Guitar'],
      songSignals: ['Dân ca', 'vocal_accompaniment'],
    });
    expect(result.suggestedClassification).toBe('traditional_with_modern_instruments');
    expect(result.warning).toContain('truyền thống');
  });

  it('flags contemporary song with traditional instruments', () => {
    const result = detectCrossCaseWarning({
      instruments: ['Đàn tranh'],
      songSignals: ['Pop'],
    });
    expect(result.suggestedClassification).toBe('contemporary_with_traditional_instruments');
    expect(result.warning).toContain('đương đại');
  });

  it('returns none when no cross-case is detected', () => {
    const result = detectCrossCaseWarning({
      instruments: ['Đàn bầu'],
      songSignals: ['Quan họ'],
    });
    expect(result.suggestedClassification).toBe('none');
    expect(result.warning).toBeNull();
  });
});
