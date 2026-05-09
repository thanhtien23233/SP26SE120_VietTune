import { describe, expect, it } from 'vitest';

import { unwrapSemanticSearchResults } from '@/services/semanticSearchService';
import { VerificationStatus } from '@/types';

const semanticRow = {
  similarityScore: 0.7288403,
  recording: {
    id: '15bfe627-2baa-49c7-9f0c-ae83b1ef8f6b',
    title: 'Đàn tranh vùng Cao Bằng độc tấu',
    description: null,
    audioFileUrl:
      'https://gvvmrvflustdxrhxpqso.supabase.co/storage/v1/object/public/VietTuneArchive/sample.mp3',
    durationSeconds: 17,
    uploadedById: '00000000-0000-0000-0007-000000000003',
    ethnicGroupId: '00000000-0000-0000-0001-000000000001',
    ceremonyId: '00000000-0000-0000-0003-000000000003',
    performanceContext: 'instrumental',
    recordingDate: '2026-05-08T13:45:44.153',
    status: 2,
    instruments: [
      {
        id: '00000000-0000-0000-0002-000000000002',
        name: 'Đàn tranh',
      },
    ],
  },
};

describe('unwrapSemanticSearchResults', () => {
  it('unwraps backend envelope and normalizes recording rows for Explore UI', () => {
    const rows = unwrapSemanticSearchResults({
      query: 'bản solo dân tộc Tày',
      totalResults: 10,
      results: [semanticRow],
    });

    expect(rows).toHaveLength(1);
    expect(rows[0]?.similarityScore).toBeCloseTo(0.7288403);
    expect(rows[0]?.recording.id).toBe('15bfe627-2baa-49c7-9f0c-ae83b1ef8f6b');
    expect(rows[0]?.recording.title).toBe('Đàn tranh vùng Cao Bằng độc tấu');
    expect(rows[0]?.recording.audioUrl).toContain('sample.mp3');
    expect(rows[0]?.recording.duration).toBe(17);
    expect(rows[0]?.recording.instruments[0]?.nameVietnamese).toBe('Đàn tranh');
    expect(rows[0]?.recording.metadata.ritualContext).toBe('');
    expect(rows[0]?.recording.verificationStatus).toBe(VerificationStatus.VERIFIED);
  });

  it('keeps compatibility with direct array responses', () => {
    const rows = unwrapSemanticSearchResults([semanticRow]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.recording.title).toBe('Đàn tranh vùng Cao Bằng độc tấu');
  });

  it('returns an empty list for unexpected response shapes', () => {
    expect(unwrapSemanticSearchResults({ query: 'missing results' })).toEqual([]);
  });
});
