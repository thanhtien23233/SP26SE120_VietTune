import { describe, expect, it } from 'vitest';

import { buildKnowledgeGraphData } from '@/features/knowledge-graph/hooks/useKnowledgeGraphData';
import type { ResearcherAnalysisRecord } from '@/features/researcher/researcherPortalTypes';
import {
  InstrumentCategory,
  RecordingQuality,
  RecordingType,
  Region,
  VerificationStatus,
} from '@/types';
import type { RecordingMetadata } from '@/types';
import type { User } from '@/types/user';
import { UserRole } from '@/types/user';

const stubUser: User = {
  id: 'u1',
  username: 't',
  email: 't@t',
  role: UserRole.USER,
  fullName: 'T',
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
};

const stubMeta: RecordingMetadata = {
  recordingQuality: RecordingQuality.PROFESSIONAL,
};

function baseRecording(id: string, title: string): ResearcherAnalysisRecord {
  return {
    id,
    title,
    description: '',
    ethnicity: {
      id: 'eth-1',
      name: 'Group',
      nameVietnamese: 'Nhóm',
      region: Region.RED_RIVER_DELTA,
      recordingCount: 0,
    },
    region: Region.RED_RIVER_DELTA,
    recordingType: RecordingType.FOLK_SONG,
    duration: 1,
    audioUrl: '',
    instruments: [],
    performers: [],
    uploadedDate: '2020-01-01T00:00:00.000Z',
    uploader: stubUser,
    tags: [],
    metadata: stubMeta,
    verificationStatus: VerificationStatus.VERIFIED,
    viewCount: 0,
    likeCount: 0,
    downloadCount: 0,
  };
}

describe('buildKnowledgeGraphData', () => {
  it('dedupes undirected edges via Set (many recordings → one eth–region link)', () => {
    const a = baseRecording('1', 'A');
    const b = baseRecording('2', 'B');
    const data = buildKnowledgeGraphData([a, b], [], [], []);
    const located = data.links.filter(
      (l) => l.type === 'located_in' && typeof l.source === 'string' && l.source.startsWith('eth_'),
    );
    expect(located).toHaveLength(1);
  });

  it('dedupes duplicate instrument rows on the same recording', () => {
    const r = baseRecording('1', 'One');
    r.instruments = [
      {
        id: 'inst-x',
        name: 'Dan tranh',
        nameVietnamese: 'Đàn tranh',
        category: InstrumentCategory.STRING,
        images: [],
        recordingCount: 0,
      },
      {
        id: 'inst-x',
        name: 'Dan tranh',
        nameVietnamese: 'Đàn tranh',
        category: InstrumentCategory.STRING,
        images: [],
        recordingCount: 0,
      },
    ];
    const data = buildKnowledgeGraphData([r], [], [], []);
    const uses = data.links.filter((l) => l.type === 'uses_instrument');
    expect(uses).toHaveLength(1);
    const inst = data.nodes.find((n) => n.type === 'instrument');
    expect(inst?.val).toBe(0.4);
  });

  it('sets backendId and apiEntityType for explore and recording-detail alignment', () => {
    const r = baseRecording('recording-guid-7', 'Title');
    r.instruments = [
      {
        id: 'instrument-guid-2',
        name: 'Dan tranh',
        nameVietnamese: 'Đàn tranh',
        category: InstrumentCategory.STRING,
        images: [],
        recordingCount: 0,
      },
    ];
    const data = buildKnowledgeGraphData([r], [], [], []);
    const rec = data.nodes.find((n) => n.id === 'rec_recording-guid-7');
    expect(rec?.backendId).toBe('recording-guid-7');
    expect(rec?.apiEntityType).toBe('Recording');
    const eth = data.nodes.find((n) => n.type === 'ethnic_group');
    expect(eth?.backendId).toBe('eth-1');
    expect(eth?.apiEntityType).toBe('EthnicGroup');
    const inst = data.nodes.find((n) => n.type === 'instrument');
    expect(inst?.backendId).toBe('instrument-guid-2');
    expect(inst?.apiEntityType).toBe('Instrument');
  });
});
