import { apiFetch, apiOk, asApiEnvelope } from '@/api';
import type { ApiSemanticSearch768Query } from '@/api';
import {
  InstrumentCategory,
  RecordingQuality,
  RecordingType,
  Region,
  UserRole,
  VerificationStatus,
  type Recording,
} from '@/types';

const SEMANTIC_CIRCUIT_BREAKER_MS = 3 * 60 * 1000;
let semanticBlockedUntil = 0;

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const response = (error as { response?: { status?: unknown } }).response;
  if (!response || typeof response !== 'object') return undefined;
  const status = response.status;
  return typeof status === 'number' ? status : undefined;
}

export interface SemanticSearchResult {
  recording: Recording;
  similarityScore: number;
  matchedText?: string;
}

export interface SemanticSearch768Response {
  query?: string;
  totalResults?: number;
  results?: unknown[] | null;
}

export interface SemanticSearchRequestParams {
  q: string;
  topK?: number;
  minScore?: number;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function normalizeObjectKeys(input: unknown): unknown {
  if (Array.isArray(input)) return input.map(normalizeObjectKeys);
  const obj = asRecord(input);
  if (!obj) return input;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const normalizedKey = /^[A-Z]/.test(key) ? key.charAt(0).toLowerCase() + key.slice(1) : key;
    out[normalizedKey] = normalizeObjectKeys(value);
  }
  return out;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number {
  for (const key of keys) {
    const value = obj[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return 0;
}

function toRecordingType(context: string): RecordingType {
  const normalized = context.toLowerCase();
  if (normalized.includes('instrument')) return RecordingType.INSTRUMENTAL;
  if (normalized.includes('vocal') || normalized.includes('sing')) return RecordingType.VOCAL;
  if (normalized.includes('ceremon')) return RecordingType.CEREMONIAL;
  return RecordingType.OTHER;
}

function toVerificationStatus(status: unknown): VerificationStatus {
  return status === 2 || status === '2' || status === 'VERIFIED' || status === 'APPROVED'
    ? VerificationStatus.VERIFIED
    : VerificationStatus.PENDING;
}

function normalizeSemanticRecording(input: unknown, index: number): Recording {
  const normalized = asRecord(normalizeObjectKeys(input)) ?? {};
  const id = pickString(normalized, ['id', 'recordingId']) || `semantic-recording-${index}`;
  const uploadedDate =
    pickString(normalized, ['uploadedDate', 'uploadedAt', 'createdAt', 'recordingDate']) ||
    new Date(0).toISOString();
  const ethnicGroupId = pickString(normalized, ['ethnicGroupId', 'ethnicityId']);
  const regionName = pickString(normalized, ['regionName', 'regionLabel']);
  const ceremonyName = pickString(normalized, ['ceremonyName', 'eventTypeName', 'ritualName']);
  const communeName = pickString(normalized, ['communeName', 'recordingLocation', 'provinceName']);
  const instrumentsRaw = Array.isArray(normalized.instruments) ? normalized.instruments : [];
  const instruments = instrumentsRaw
    .map((item, itemIndex) => {
      const instrument = asRecord(item);
      if (!instrument) return null;
      const name = pickString(instrument, ['nameVietnamese', 'name']);
      if (!name) return null;
      return {
        id: pickString(instrument, ['id']) || `semantic-inst-${itemIndex}-${name}`,
        name,
        nameVietnamese: pickString(instrument, ['nameVietnamese']) || name,
        category: InstrumentCategory.STRING,
        images: [] as string[],
        recordingCount: 0,
      };
    })
    .filter((item): item is Recording['instruments'][number] => item != null);

  return {
    ...normalized,
    id,
    title: pickString(normalized, ['title', 'titleVietnamese', 'name']) || 'Không có tiêu đề',
    titleVietnamese: pickString(normalized, ['titleVietnamese']),
    description: pickString(normalized, ['description']),
    ethnicity: {
      id: ethnicGroupId || 'semantic-ethnicity',
      name: pickString(normalized, ['ethnicityName', 'ethnicGroupName', 'ethnicName']),
      nameVietnamese: pickString(normalized, [
        'ethnicityNameVietnamese',
        'ethnicGroupNameVietnamese',
        'ethnicGroupName',
        'ethnicityName',
      ]),
      region: '' as Region,
      recordingCount: 0,
    },
    region: (pickString(normalized, ['region', 'regionCode']) as Region) || ('' as Region),
    regionName,
    communeName,
    ceremonyName,
    recordingType: toRecordingType(pickString(normalized, ['performanceContext', 'recordingType'])),
    duration: pickNumber(normalized, ['duration', 'durationSeconds']),
    audioUrl: pickString(normalized, ['audioUrl', 'audioFileUrl', 'audioData', 'mediaUrl', 'url']),
    waveformUrl: pickString(normalized, ['waveformUrl']),
    coverImage: pickString(normalized, ['coverImage', 'thumbnailUrl']),
    instruments,
    performers: [],
    recordedDate: pickString(normalized, ['recordedDate', 'recordingDate']),
    uploadedDate,
    uploader: {
      id: pickString(normalized, ['uploadedById', 'uploaderId']) || 'semantic-uploader',
      username: '',
      email: '',
      fullName: pickString(normalized, ['uploadedByName', 'uploaderName']) || 'Không rõ',
      role: UserRole.USER,
      createdAt: uploadedDate,
      updatedAt: uploadedDate,
    },
    tags: [],
    metadata: {
      recordingQuality: RecordingQuality.FIELD_RECORDING,
      ritualContext: ceremonyName,
      lyrics: pickString(normalized, ['lyricsOriginal', 'lyrics']),
      lyricsTranslation: pickString(normalized, ['lyricsVietnamese', 'lyricsTranslation']),
    },
    verificationStatus: toVerificationStatus(normalized.status ?? normalized.verificationStatus),
    viewCount: pickNumber(normalized, ['viewCount']),
    likeCount: pickNumber(normalized, ['likeCount']),
    downloadCount: pickNumber(normalized, ['downloadCount']),
  } as Recording;
}

function normalizeSemanticResult(input: unknown, index: number): SemanticSearchResult | null {
  const row = asRecord(normalizeObjectKeys(input));
  if (!row) return null;
  const score = row.similarityScore;
  const recording = row.recording;
  if (typeof score !== 'number' || !recording) return null;
  return {
    recording: normalizeSemanticRecording(recording, index),
    similarityScore: score,
    matchedText: pickString(row, ['matchedText']),
  };
}

export function unwrapSemanticSearchResults(input: unknown): SemanticSearchResult[] {
  const rows = Array.isArray(input) ? input : asRecord(input)?.results;
  if (!Array.isArray(rows)) return [];
  return rows
    .map((row, index) => normalizeSemanticResult(row, index))
    .filter((row): row is SemanticSearchResult => row != null);
}

/**
 * Calls the backend Semantic Search endpoint
 */
export const searchSemantic = async (
  params: SemanticSearchRequestParams,
): Promise<SemanticSearchResult[]> => {
  if (Date.now() < semanticBlockedUntil) {
    throw new Error('Semantic search temporarily unavailable');
  }

  const query: ApiSemanticSearch768Query = {
    q: params.q,
    topK: params.topK ?? 10,
    /** Align with `SemanticSearchController` / `Search768Async` default (0.5). */
    minScore: params.minScore ?? 0.5,
  };

  try {
    const result = await apiOk(
      asApiEnvelope<SemanticSearch768Response | SemanticSearchResult[]>(
        apiFetch.GET('/api/search/semantic-768', {
          params: { query },
        }),
      ),
    );
    semanticBlockedUntil = 0;
    return unwrapSemanticSearchResults(result);
  } catch (error) {
    const status = getErrorStatus(error);
    if (status != null && status >= 500) {
      semanticBlockedUntil = Date.now() + SEMANTIC_CIRCUIT_BREAKER_MS;
    }
    throw error;
  }
};

export const semanticSearchService = {
  searchSemantic,
};
