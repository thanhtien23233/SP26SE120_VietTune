import { describe, expect, it } from 'vitest';

import { hasActiveGuestFilters } from '@/features/explore/utils/exploreGuestFilters';
import { RecordingType, Region } from '@/types';

describe('hasActiveGuestFilters', () => {
  it('is false for empty filters', () => {
    expect(hasActiveGuestFilters({})).toBe(false);
  });

  it('is false for whitespace-only query', () => {
    expect(hasActiveGuestFilters({ query: '   \t' })).toBe(false);
  });

  it('is true for non-empty query', () => {
    expect(hasActiveGuestFilters({ query: 'dân ca' })).toBe(true);
  });

  it('is true when any facet array is non-empty', () => {
    expect(hasActiveGuestFilters({ regions: [Region.RED_RIVER_DELTA] })).toBe(true);
    expect(hasActiveGuestFilters({ ethnicityIds: ['x'] })).toBe(true);
    expect(hasActiveGuestFilters({ recordingTypes: [RecordingType.FOLK_SONG] })).toBe(true);
    expect(hasActiveGuestFilters({ tags: ['folk'] })).toBe(true);
  });

  it('is true when date range is set', () => {
    expect(hasActiveGuestFilters({ dateFrom: '2020-01-01' })).toBe(true);
    expect(hasActiveGuestFilters({ dateTo: '2025-01-01' })).toBe(true);
  });
});
