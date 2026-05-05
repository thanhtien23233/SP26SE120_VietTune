import { describe, expect, it } from 'vitest';

import { compareDeclaredDetectedInstruments } from '@/utils/instrumentDeclaredDetectedCompare';

describe('compareDeclaredDetectedInstruments', () => {
  it('matches declared instruments with normalized names', () => {
    const result = compareDeclaredDetectedInstruments(
      ['Đàn Tranh', 'Sáo trúc'],
      [
        {
          name: 'dan tranh',
          confidence: 0.87,
        },
      ],
    );

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toMatchObject({
      declared: 'Đàn Tranh',
      detected: 'dan tranh',
      matched: true,
    });
    expect(result.rows[1]).toMatchObject({
      declared: 'Sáo trúc',
      detected: null,
      matched: false,
    });
    expect(result.mismatchCount).toBe(1);
  });

  it('keeps unmatched detected instruments as additions', () => {
    const result = compareDeclaredDetectedInstruments(
      ['Đàn bầu'],
      [
        {
          name: 'Đàn bầu',
          confidence: 0.6,
        },
        {
          name: 'Guitar',
          confidence: 0.71,
        },
      ],
    );

    expect(result.matchedCount).toBe(1);
    expect(result.unmatchedDetected).toHaveLength(1);
    expect(result.unmatchedDetected[0]?.name).toBe('Guitar');
  });
});
