import { describe, expect, it } from 'vitest';

import type { EthnicGroupItem, InstrumentItem, VocalStyleItem } from '@/services/referenceDataService';
import type { DetectedInstrument } from '@/types/instrumentDetection';
import {
  dedupeAndSortMetadataSuggestions,
  groupMetadataSuggestionsForAdvisory,
  mapInstrumentsToAdvisoryMetadataSuggestions,
  mapInstrumentsToMetadataSuggestions,
  metadataSuggestionKey,
  normalizeInstrumentMatchKey,
} from '@/utils/instrumentMetadataMapper';

const ethnicGroupsData: EthnicGroupItem[] = [
  { id: 'eg-1', name: 'Kinh', primaryRegion: 'Đồng bằng sông Hồng' },
  { id: 'eg-2', name: 'Tày', primaryRegion: 'Đông Bắc' },
];

const instrumentsData: InstrumentItem[] = [
  { id: 'i1', name: 'Đàn tranh', originEthnicGroupId: 'eg-1' },
  { id: 'i2', name: 'Sáo trúc', originEthnicGroupId: 'eg-2' },
];

const vocalStylesData: VocalStyleItem[] = [
  { id: 'v1', name: 'Ca trù', ethnicGroupId: 'eg-1' },
  { id: 'v2', name: 'Hát then', ethnicGroupId: 'eg-2' },
];

const availableRegions = ['Đồng bằng sông Hồng', 'Đông Bắc', 'Tây Nguyên'];

describe('normalizeInstrumentMatchKey', () => {
  it('strips diacritics and case', () => {
    expect(normalizeInstrumentMatchKey('Đàn Tranh')).toBe('dan tranh');
    expect(normalizeInstrumentMatchKey("T'rung")).toBe('trung');
  });
});

describe('mapInstrumentsToMetadataSuggestions', () => {
  it('maps DB-linked instrument to ethnicity, region, and vocal styles', () => {
    const detected: DetectedInstrument[] = [{ name: 'Đàn tranh', confidence: 0.9 }];
    const out = mapInstrumentsToMetadataSuggestions({
      detected,
      instrumentsData,
      ethnicGroupsData,
      vocalStylesData,
      availableRegions,
    });
    expect(out.some((s) => s.field === 'ethnicity' && s.value === 'Kinh')).toBe(true);
    expect(out.some((s) => s.field === 'region')).toBe(true);
    expect(out.some((s) => s.field === 'vocalStyle' && s.value === 'Ca trù')).toBe(true);
  });

  it('uses fallback when instrument not in DB', () => {
    const detected: DetectedInstrument[] = [{ name: 'Dan bau', confidence: 0.4 }];
    const out = mapInstrumentsToMetadataSuggestions({
      detected,
      instrumentsData: [],
      ethnicGroupsData,
      vocalStylesData,
      availableRegions,
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out.some((s) => s.field === 'ethnicity')).toBe(true);
  });

  it('dedupes same field+value keeping higher confidence', () => {
    const detected: DetectedInstrument[] = [
      { name: 'Đàn tranh', confidence: 0.5 },
      { name: 'dan tranh', confidence: 0.9 },
    ];
    const out = mapInstrumentsToMetadataSuggestions({
      detected,
      instrumentsData,
      ethnicGroupsData,
      vocalStylesData,
      availableRegions,
    });
    const kinh = out.filter((s) => s.field === 'ethnicity' && s.value === 'Kinh');
    expect(kinh.length).toBe(1);
    expect(kinh[0].confidence).toBe(0.9);
  });
});

describe('metadataSuggestionKey', () => {
  it('is stable for same logical suggestion', () => {
    const a = metadataSuggestionKey({
      field: 'region',
      value: 'Đồng bằng sông Hồng',
      sourceInstrument: 'X',
      confidence: 1,
    });
    const b = metadataSuggestionKey({
      field: 'region',
      value: 'Đồng bằng sông Hồng',
      sourceInstrument: 'X',
      confidence: 0.5,
    });
    expect(a).toBe(b);
  });
});

describe('dedupeAndSortMetadataSuggestions', () => {
  it('sorts by confidence descending', () => {
    const sorted = dedupeAndSortMetadataSuggestions([
      { field: 'region', value: 'A', sourceInstrument: 'i1', confidence: 0.2 },
      { field: 'region', value: 'B', sourceInstrument: 'i2', confidence: 0.9 },
    ]);
    expect(sorted[0].confidence).toBeGreaterThanOrEqual(sorted[sorted.length - 1].confidence);
  });
});

describe('groupMetadataSuggestionsForAdvisory', () => {
  it('marks clear primary when gap > 20%', () => {
    const grouped = groupMetadataSuggestionsForAdvisory([
      { field: 'region', value: 'Miền Bắc', sourceInstrument: 'Đàn tranh', confidence: 0.9 },
      { field: 'region', value: 'Miền Trung', sourceInstrument: 'Sáo trúc', confidence: 0.6 },
    ]);
    const region = grouped.find((g) => g.field === 'region');
    expect(region).toBeDefined();
    expect(region?.conflictDetected).toBe(false);
    expect(region?.requiresExpert).toBe(false);
  });

  it('marks mixed influence when gap is between 5% and 20%', () => {
    const grouped = groupMetadataSuggestionsForAdvisory([
      { field: 'ethnicity', value: 'Kinh', sourceInstrument: 'Đàn tranh', confidence: 0.72 },
      { field: 'ethnicity', value: 'Tày', sourceInstrument: 'Sáo trúc', confidence: 0.6 },
    ]);
    const ethnicGroup = grouped.find((g) => g.field === 'ethnicGroup');
    expect(ethnicGroup).toBeDefined();
    expect(ethnicGroup?.conflictDetected).toBe(true);
    expect(ethnicGroup?.requiresExpert).toBe(false);
  });

  it('marks requiresExpert when gap < 5%', () => {
    const grouped = groupMetadataSuggestionsForAdvisory([
      { field: 'vocalStyle', value: 'Dân ca', sourceInstrument: 'Đàn tranh', confidence: 0.66 },
      { field: 'vocalStyle', value: 'Chèo', sourceInstrument: 'Sáo trúc', confidence: 0.63 },
    ]);
    const genre = grouped.find((g) => g.field === 'genre');
    expect(genre).toBeDefined();
    // gap 0.03 < 5% → not "mixed influence" band, but still requires expert (narrow margin)
    expect(genre?.conflictDetected).toBe(false);
    expect(genre?.requiresExpert).toBe(true);
  });

  it('groups eventType rows separately from vocalStyle (genre)', () => {
    const grouped = groupMetadataSuggestionsForAdvisory([
      { field: 'vocalStyle', value: 'Dân ca', sourceInstrument: 'A', confidence: 0.9 },
      { field: 'eventType', value: 'Lễ hội', sourceInstrument: 'A', confidence: 0.5 },
    ]);
    const genre = grouped.find((g) => g.field === 'genre');
    const eventType = grouped.find((g) => g.field === 'eventType');
    expect(genre?.candidates.some((c) => c.value === 'Lễ hội')).toBe(false);
    expect(eventType?.candidates.some((c) => c.value === 'Lễ hội')).toBe(true);
    expect(genre?.candidates.some((c) => c.value === 'Dân ca')).toBe(true);
  });

  it('dedupes candidates by value and keeps higher score', () => {
    const grouped = groupMetadataSuggestionsForAdvisory([
      { field: 'region', value: 'Miền Bắc', sourceInstrument: 'Đàn tranh', confidence: 0.52 },
      { field: 'region', value: 'Miền Bắc', sourceInstrument: 'Sáo trúc', confidence: 0.8 },
    ]);
    const region = grouped.find((g) => g.field === 'region');
    expect(region).toBeDefined();
    expect(region?.candidates).toHaveLength(1);
    expect(region?.candidates[0].score).toBe(0.8);
  });
});

describe('mapInstrumentsToAdvisoryMetadataSuggestions', () => {
  it('maps instrument detections into advisory field groups', () => {
    const detected: DetectedInstrument[] = [{ name: 'Đàn tranh', confidence: 0.9 }];

    const out = mapInstrumentsToAdvisoryMetadataSuggestions({
      detected,
      instrumentsData,
      ethnicGroupsData,
      vocalStylesData,
      availableRegions,
    });

    expect(out.some((x) => x.field === 'region')).toBe(true);
    expect(out.some((x) => x.field === 'ethnicGroup')).toBe(true);
    expect(out.some((x) => x.field === 'genre')).toBe(true);
    expect(out.some((x) => x.field === 'eventType')).toBe(true);
  });
});
