import { describe, expect, it } from 'vitest';

import { interpolate } from '../interpolate';

describe('interpolate', () => {
  it('replaces {{key}} with string values', () => {
    expect(interpolate('Bước {{step}}', { step: 2 })).toBe('Bước 2');
  });

  it('replaces with number', () => {
    expect(interpolate('n={{n}}', { n: 0 })).toBe('n=0');
  });

  it('missing key becomes empty string', () => {
    expect(interpolate('x{{a}}y', {})).toBe('xy');
  });
});
