import { describe, expect, it } from 'vitest';

import { normalizeSearchText, scoreSearchOption, tokenizeSearchText } from './searchText';

describe('searchText utils', () => {
  it('normalizes vietnamese diacritics and spaces', () => {
    expect(normalizeSearchText('  Đàn   Bầu ')).toBe('dan bau');
  });

  it('tokenizes normalized query', () => {
    expect(tokenizeSearchText('Đàn Bầu truyền thống')).toEqual(['dan', 'bau', 'truyen', 'thong']);
  });

  it('scores matching options and excludes unrelated ones', () => {
    expect(scoreSearchOption('Đàn bầu', 'dan')).toBeGreaterThan(0);
    expect(scoreSearchOption('Sáo trúc', 'dan bau')).toBe(-1);
  });
});
