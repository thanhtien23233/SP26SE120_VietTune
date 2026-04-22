import { apiFetch, apiFetchLoose, apiOk, asApiEnvelope, openApiQueryRecord } from '@/api';
import type {
  ApiRecordingListQuery,
  ApiRecordingSearchByFilterQuery,
  ApiSubmissionDto,
} from '@/api';
import type { RecordingUploadDto } from '@/api';
import { legacyGetAnonymous } from '@/api/legacyHttp';
import {
  Recording,
  SearchFilters,
  PaginatedResponse,
  ApiResponse,
  Region,
  RecordingType,
  RecordingQuality,
  VerificationStatus,
  UserRole,
  InstrumentCategory,
} from '@/types';
import { pickContributorFieldsFromApiRow } from '@/utils/contributorFields';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const raw = obj[key];
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
  }
  return '';
}

function pickStringArray(obj: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const raw = obj[key];
    if (Array.isArray(raw)) {
      const arr = raw.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean);
      if (arr.length > 0) return arr;
    }
    if (typeof raw === 'string' && raw.trim()) {
      const arr = raw
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
      if (arr.length > 0) return arr;
    }
  }
  return [];
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

function mapGuestRowToRecording(row: unknown, index: number): Recording {
  const normalized = asRecord(normalizeObjectKeys(row)) ?? {};
  const id =
    pickString(normalized, ['id', 'recordingId', 'submissionId']) || `guest-recording-${index}`;
  const title = pickString(normalized, ['title', 'titleVietnamese', 'name']) || 'Không có tiêu đề';
  const audioUrl = pickString(normalized, [
    'audioUrl',
    'audioFileUrl',
    'audioData',
    'mediaUrl',
    'url',
  ]);
  const uploadedDate =
    pickString(normalized, ['uploadedDate', 'createdAt', 'uploadedAt']) ||
    new Date(0).toISOString();
  const regionRaw = pickString(normalized, ['region', 'regionCode']);
  const regionValues = Object.values(Region);
  const region = regionValues.includes(regionRaw as Region)
    ? (regionRaw as Region)
    : Region.RED_RIVER_DELTA;

  const topLevelInstruments = pickStringArray(normalized, [
    'instrumentNames',
    'instruments',
    'instrumentTags',
  ]);
  const culturalContext = asRecord(normalized.culturalContext);
  const contextInstruments = culturalContext
    ? pickStringArray(culturalContext, ['instruments'])
    : [];
  const mergedInstrumentNames = Array.from(
    new Set([...topLevelInstruments, ...contextInstruments]),
  );
  const rawTags = pickStringArray(normalized, ['tags', 'tagNames', 'metadataTags', 'keywords']);

  const contrib = pickContributorFieldsFromApiRow(normalized);
  const uploaderIdFlat = pickString(normalized, ['uploaderId', 'uploadedById']);
  const uploaderDisplayName =
    contrib.fullName || pickString(normalized, ['uploaderName', 'uploadedByName']) || 'Guest';
  const uploaderHandle = contrib.username || '';

  return {
    id,
    title,
    titleVietnamese: pickString(normalized, ['titleVietnamese']),
    description: pickString(normalized, ['description']),
    ethnicity: {
      id: pickString(normalized, ['ethnicityId']) || 'guest-ethnicity',
      name: pickString(normalized, ['ethnicityName', 'ethnicity']) || 'Không xác định',
      nameVietnamese:
        pickString(normalized, ['ethnicityNameVietnamese', 'ethnicityName', 'ethnicity']) ||
        'Không xác định',
      region,
      recordingCount: 0,
    },
    region,
    recordingType: RecordingType.OTHER,
    duration: Number(normalized.duration ?? 0) || 0,
    audioUrl,
    waveformUrl: pickString(normalized, ['waveformUrl']),
    coverImage: pickString(normalized, ['coverImage', 'thumbnailUrl']),
    instruments: mergedInstrumentNames.map((name, idx) => ({
      id: `guest-inst-${idx}-${name}`,
      name,
      nameVietnamese: name,
      category: InstrumentCategory.STRING,
      images: [],
      recordingCount: 0,
    })),
    performers: [],
    recordedDate: pickString(normalized, ['recordedDate', 'recordingDate']),
    uploadedDate,
    uploader: {
      id: contrib.id || uploaderIdFlat || 'guest-uploader',
      username: uploaderHandle,
      email: '',
      fullName: uploaderDisplayName,
      role: UserRole.USER,
      createdAt: uploadedDate,
      updatedAt: uploadedDate,
    },
    tags: rawTags,
    metadata: {
      recordingQuality: RecordingQuality.FIELD_RECORDING,
      lyrics: pickString(normalized, ['lyrics']),
    },
    verificationStatus: VerificationStatus.VERIFIED,
    viewCount: Number(normalized.viewCount ?? 0) || 0,
    likeCount: Number(normalized.likeCount ?? 0) || 0,
    downloadCount: Number(normalized.downloadCount ?? 0) || 0,
  };
}

function pickGuestRows(input: unknown): Recording[] {
  if (Array.isArray(input)) return input.map((row, idx) => mapGuestRowToRecording(row, idx));
  const root = asRecord(input);
  if (!root) return [];
  const candidates: unknown[] = [
    root.items,
    root.data,
    root.records,
    root.result,
    asRecord(root.data)?.items,
    asRecord(root.data)?.records,
    asRecord(root.data)?.data,
    asRecord(root.result)?.items,
  ];
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate.map((row, idx) => mapGuestRowToRecording(row, idx));
    }
  }
  return [];
}

function toGuestPaginatedResponse(
  input: unknown,
  page: number,
  pageSize: number,
): PaginatedResponse<Recording> {
  const root = asRecord(input) ?? {};
  const rows = pickGuestRows(input);
  const pageRaw = root.page ?? asRecord(root.data)?.page;
  const pageSizeRaw = root.pageSize ?? asRecord(root.data)?.pageSize;
  const totalRaw =
    root.total ?? root.totalCount ?? asRecord(root.data)?.total ?? asRecord(root.data)?.totalCount;
  const total = typeof totalRaw === 'number' ? totalRaw : rows.length;
  const totalPagesRaw = root.totalPages ?? asRecord(root.data)?.totalPages;
  const totalPages =
    typeof totalPagesRaw === 'number'
      ? totalPagesRaw
      : Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  return {
    items: rows,
    total,
    totalPages,
    page: typeof pageRaw === 'number' ? pageRaw : page,
    pageSize: typeof pageSizeRaw === 'number' ? pageSizeRaw : pageSize,
  };
}

type RecordingSearchByFilterResponse =
  | Record<string, unknown>[]
  | {
      data?: Record<string, unknown>[] | { items?: Record<string, unknown>[]; Items?: Record<string, unknown>[] };
      Data?: Record<string, unknown>[] | { items?: Record<string, unknown>[]; Items?: Record<string, unknown>[] };
      items?: Record<string, unknown>[];
      Items?: Record<string, unknown>[];
      records?: Record<string, unknown>[];
      result?: Record<string, unknown>[] | { items?: Record<string, unknown>[] };
      value?: Record<string, unknown>[];
    };

export const recordingService = {
  getRecordings: async (
    page: number = 1,
    pageSize: number = 20,
    opts?: { signal?: AbortSignal },
  ) => {
    const params: ApiRecordingListQuery = { page, pageSize };
    return apiOk(
      asApiEnvelope<PaginatedResponse<Recording>>(
        apiFetch.GET('/api/Recording', {
          params: { query: openApiQueryRecord(params) },
          signal: opts?.signal,
        }),
      ),
    );
  },

  /**
   * Guest-only catalog (no Authorization header): GET /api/RecordingGuest
   * Uses raw axios client to avoid global auth interceptor/token injection.
   */
  getGuestRecordings: async (
    page: number = 1,
    pageSize: number = 20,
    opts?: { signal?: AbortSignal },
  ) => {
    const reqOpts = { signal: opts?.signal, params: { page, pageSize } };
    try {
      const data = await legacyGetAnonymous<unknown>('/RecordingGuest', reqOpts);
      return toGuestPaginatedResponse(data, page, pageSize);
    } catch (primaryErr) {
      try {
        const data = await legacyGetAnonymous<unknown>('/recordingGuest', reqOpts);
        return toGuestPaginatedResponse(data, page, pageSize);
      } catch {
        throw primaryErr;
      }
    }
  },

  /** Researcher: GET /api/Recording/search-by-filter — verified catalog with ID metadata filters. */
  searchRecordingsByFilter: async (query: ApiRecordingSearchByFilterQuery) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === '') continue;
      params.set(k, String(v));
    }
    return apiOk(
      asApiEnvelope<RecordingSearchByFilterResponse>(
        apiFetch.GET('/api/Recording/search-by-filter', {
          params: { query: openApiQueryRecord(query) },
        }),
      ),
    );
  },

  // Get recording by ID (backend: GET /api/Recording/{id})
  getRecordingById: async (id: string) => {
    return apiOk(
      asApiEnvelope<ApiResponse<Recording>>(
        apiFetch.GET('/api/Recording/{id}', {
          params: { path: { id } },
        }),
      ),
    );
  },

  // Search recordings (backend: GET /api/Search/songs with query params)
  searchRecordings: async (
    filters: SearchFilters,
    page: number = 1,
    pageSize: number = 20,
    opts?: { signal?: AbortSignal },
  ) => {
    const ethnicNames = filters.ethnicityIds?.join(',') || undefined;
    const genreTags = filters.tags?.join(',') || undefined;
    return apiOk(
      asApiEnvelope<PaginatedResponse<Recording>>(
        apiFetch.GET('/api/Search/songs', {
          params: {
            query: openApiQueryRecord({
              q: filters.query,
              ethnic: ethnicNames,
              genre: genreTags,
              page,
              pageSize,
            }),
          },
          signal: opts?.signal,
        }),
      ),
    );
  },

  // Upload new recording (backend: POST /api/Recording with JSON body)
  uploadRecording: async (data: Partial<Recording>) => {
    return apiOk(
      asApiEnvelope<ApiResponse<Recording>>(
        apiFetchLoose.POST('/api/Recording', {
          body: data as unknown,
        }),
      ),
    );
  },

  // Update recording (backend: PUT /api/Recording/{id}/upload — OpenAPI RecordingDto)
  updateRecording: async (id: string, data: RecordingUploadDto) => {
    return apiOk(
      asApiEnvelope<ApiResponse<Recording>>(
        apiFetch.PUT('/api/Recording/{id}/upload', {
          params: { path: { id } },
          body: data as never,
        }),
      ),
    );
  },

  // Create submission (backend: POST /api/Submission/create-submission)
  createSubmission: async (data: {
    audioFileUrl?: string;
    videoFileUrl?: string;
    uploadedById: string;
  }) => {
    const payload: ApiSubmissionDto & { videoFileUrl?: string } = {
      audioFileUrl: data.audioFileUrl ?? null,
      uploadedById: data.uploadedById,
      videoFileUrl: data.videoFileUrl,
    };
    return apiOk(
      asApiEnvelope<{
        isSuccess: boolean;
        message: string;
        data: {
          audioFileUrl?: string;
          videoFileUrl?: string;
          uploadedById: string;
          submissionId: string;
          recordingId: string;
        };
      }>(
        apiFetch.POST('/api/Submission/create-submission', {
          body: payload,
        }),
      ),
    );
  },

  // Delete recording (backend: DELETE /api/Recording/{id})
  deleteRecording: async (id: string) => {
    return apiOk(
      asApiEnvelope<ApiResponse<void>>(
        apiFetchLoose.DELETE(`/api/Recording/${encodeURIComponent(id)}`, {}),
      ),
    );
  },

  // Get popular recordings (backend: GET /api/Song/popular)
  getPopularRecordings: async (limit: number = 10) => {
    return apiOk(
      asApiEnvelope<ApiResponse<Recording[]>>(
        apiFetch.GET('/api/Song/popular', {
          params: { query: { limit } },
        }),
      ),
    );
  },

  // Get recent recordings (backend: GET /api/Song/recent)
  getRecentRecordings: async (limit: number = 10) => {
    return apiOk(
      asApiEnvelope<ApiResponse<Recording[]>>(
        apiFetch.GET('/api/Song/recent', {
          params: { query: { limit } },
        }),
      ),
    );
  },

  // Get featured recordings (backend: GET /api/Song/featured)
  getFeaturedRecordings: async (limit: number = 10) => {
    return apiOk(
      asApiEnvelope<ApiResponse<Recording[]>>(
        apiFetch.GET('/api/Song/featured', {
          params: { query: { limit } },
        }),
      ),
    );
  },
};
