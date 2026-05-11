import { apiFetch, apiFetchLoose, apiOk, asApiEnvelope, openApiQueryRecord } from '@/api';
import type {
  ApiRecordingListQuery,
  ApiRecordingSearchByFilterQuery,
  ApiSubmissionDto,
} from '@/api';
import type { RecordingUploadDto } from '@/api';
import { legacyGetAnonymous } from '@/api/legacyHttp';
import { PAGE_SIZE_DEFAULT } from '@/config/pagination';
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
import { normalizeSearchText } from '@/utils/searchText';

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

function toPaginatedRecordingsResponse(
  input: unknown,
  page: number,
  pageSize: number,
): PaginatedResponse<Recording> {
  const root = asRecord(input) ?? {};
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
  let items: Recording[] = [];
  for (const candidate of candidates) {
    if (!Array.isArray(candidate)) continue;
    items = candidate as Recording[];
    break;
  }
  if (items.length === 0 && Array.isArray(input)) {
    items = input as Recording[];
  }
  const pageRaw = root.page ?? asRecord(root.data)?.page;
  const pageSizeRaw = root.pageSize ?? asRecord(root.data)?.pageSize;
  const totalRaw =
    root.total ?? root.totalCount ?? asRecord(root.data)?.total ?? asRecord(root.data)?.totalCount;
  const total = typeof totalRaw === 'number' ? totalRaw : items.length;
  const totalPagesRaw = root.totalPages ?? asRecord(root.data)?.totalPages;
  const totalPages =
    typeof totalPagesRaw === 'number'
      ? totalPagesRaw
      : Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  return {
    items,
    total,
    totalPages,
    page: typeof pageRaw === 'number' ? pageRaw : page,
    pageSize: typeof pageSizeRaw === 'number' ? pageSizeRaw : pageSize,
  };
}

function hasMetadataFilters(filters: SearchFilters): boolean {
  return Boolean(
    (filters.ethnicityIds?.length ?? 0) > 0 ||
      (filters.instrumentIds?.length ?? 0) > 0 ||
      (filters.regions?.length ?? 0) > 0 ||
      (filters.recordingTypes?.length ?? 0) > 0 ||
      (filters.verificationStatus?.length ?? 0) > 0 ||
      (filters.tags?.length ?? 0) > 0 ||
      filters.dateFrom ||
      filters.dateTo,
  );
}

function matchesMetadataFilters(recording: Recording, filters: SearchFilters): boolean {
  if (filters.ethnicityIds?.length) {
    const ok = filters.ethnicityIds.some(
      (id) =>
        id === recording.ethnicity?.id ||
        id === recording.ethnicity?.name ||
        id === recording.ethnicity?.nameVietnamese,
    );
    if (!ok) return false;
  }
  if (filters.instrumentIds?.length) {
    const ok = filters.instrumentIds.some((id) =>
      (recording.instruments ?? []).some(
        (inst) => inst.id === id || inst.name === id || inst.nameVietnamese === id,
      ),
    );
    if (!ok) return false;
  }
  if (filters.regions?.length && !filters.regions.includes(recording.region)) return false;
  if (
    filters.recordingTypes?.length &&
    !filters.recordingTypes.includes(recording.recordingType)
  ) {
    return false;
  }
  if (
    filters.verificationStatus?.length &&
    !filters.verificationStatus.includes(recording.verificationStatus)
  ) {
    return false;
  }
  if (filters.tags?.length) {
    const hay = normalizeSearchText((recording.tags ?? []).join(' '));
    const queryTags = filters.tags.map((x) => normalizeSearchText(x)).filter(Boolean);
    if (!queryTags.every((tag) => hay.includes(tag))) return false;
  }
  if (filters.dateFrom || filters.dateTo) {
    const ts = new Date(recording.recordedDate || recording.uploadedDate || 0).getTime();
    const fromTs = filters.dateFrom ? new Date(filters.dateFrom).getTime() : Number.NaN;
    const toTs = filters.dateTo ? new Date(filters.dateTo).getTime() : Number.NaN;
    if (Number.isFinite(fromTs) && ts < fromTs) return false;
    if (Number.isFinite(toTs) && ts > toTs) return false;
  }
  return true;
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
  /** Authenticated title search: GET /api/Recording/search-by-title */
  searchRecordingsByTitle: async (
    title: string,
    page: number = 1,
    pageSize: number = PAGE_SIZE_DEFAULT,
    opts?: { signal?: AbortSignal },
  ): Promise<PaginatedResponse<Recording>> => {
    const data = await apiOk(
      asApiEnvelope<unknown>(
        apiFetchLoose.GET('/api/Recording/search-by-title', {
          params: { query: openApiQueryRecord({ title: title.trim() }) },
          signal: opts?.signal,
        }),
      ),
    );
    return toPaginatedRecordingsResponse(data, page, pageSize);
  },

  /** Guest title search (no Authorization): GET /api/RecordingGuest/search-by-title */
  searchGuestRecordingsByTitle: async (
    title: string,
    page: number = 1,
    pageSize: number = PAGE_SIZE_DEFAULT,
    opts?: { signal?: AbortSignal },
  ): Promise<PaginatedResponse<Recording>> => {
    const reqOpts = {
      signal: opts?.signal,
      params: { title: title.trim(), page, pageSize },
    };
    try {
      const data = await legacyGetAnonymous<unknown>('/RecordingGuest/search-by-title', reqOpts);
      return toGuestPaginatedResponse(data, page, pageSize);
    } catch (primaryErr) {
      try {
        const data = await legacyGetAnonymous<unknown>('/recordingGuest/search-by-title', reqOpts);
        return toGuestPaginatedResponse(data, page, pageSize);
      } catch {
        throw primaryErr;
      }
    }
  },

  getRecordings: async (
    page: number = 1,
    pageSize: number = PAGE_SIZE_DEFAULT,
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
    pageSize: number = PAGE_SIZE_DEFAULT,
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

  /** Guest-only filtered search (no Authorization): GET /api/RecordingGuest/search-by-filter */
  getGuestRecordingsByFilter: async (
    filters: SearchFilters,
    page: number = 1,
    pageSize: number = PAGE_SIZE_DEFAULT,
    opts?: { signal?: AbortSignal },
  ) => {
    const q = filters.query?.trim();
    if (q) {
      const titleRes = await recordingService.searchGuestRecordingsByTitle(q, page, pageSize, opts);
      if (!hasMetadataFilters({ ...filters, query: undefined })) {
        return titleRes;
      }
      const filtered = titleRes.items.filter((item) =>
        matchesMetadataFilters(item, { ...filters, query: undefined }),
      );
      return {
        items: filtered,
        total: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / Math.max(1, pageSize))),
        page,
        pageSize,
      };
    }
    const ethnicId = filters.ethnicityIds?.find((id) => id?.trim());
    const instrumentId = filters.instrumentIds?.find((id) => id?.trim());
    const regionCode = filters.regions?.[0];
    const reqOpts = {
      signal: opts?.signal,
      params: {
        page,
        pageSize,
        ...(ethnicId ? { ethnicGroupId: ethnicId.trim() } : {}),
        ...(instrumentId ? { instrumentId: instrumentId.trim() } : {}),
        ...(regionCode ? { regionCode: String(regionCode) } : {}),
      },
    };
    try {
      const data = await legacyGetAnonymous<unknown>('/RecordingGuest/search-by-filter', reqOpts);
      return toGuestPaginatedResponse(data, page, pageSize);
    } catch (primaryErr) {
      try {
        const data = await legacyGetAnonymous<unknown>('/recordingGuest/search-by-filter', reqOpts);
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

  /**
   * Authenticated catalog search with text + facet filters.
   * Legacy `GET /api/Search/songs` was removed from OpenAPI; use `GET /api/Recording/search-by-filter`
   * for metadata filters and `GET /api/Recording/search-by-title` for keyword search.
   */
  searchRecordings: async (
    filters: SearchFilters,
    page: number = 1,
    pageSize: number = PAGE_SIZE_DEFAULT,
    opts?: { signal?: AbortSignal },
  ) => {
    const q = filters.query?.trim();
    if (q) {
      const titleRes = await recordingService.searchRecordingsByTitle(q, page, pageSize, opts);
      if (!hasMetadataFilters({ ...filters, query: undefined })) {
        return titleRes;
      }
      const filtered = titleRes.items.filter((item) =>
        matchesMetadataFilters(item, { ...filters, query: undefined }),
      );
      return {
        items: filtered,
        total: filtered.length,
        totalPages: Math.max(1, Math.ceil(filtered.length / Math.max(1, pageSize))),
        page,
        pageSize,
      };
    }
    const ethnicId = filters.ethnicityIds?.find((id) => id?.trim());
    const instrumentId = filters.instrumentIds?.find((id) => id?.trim());
    const regionCode = filters.regions?.[0];
    const merged: Record<string, string | number> = {
      page,
      pageSize,
    };
    if (ethnicId) merged.ethnicGroupId = ethnicId.trim();
    if (instrumentId) merged.instrumentId = instrumentId.trim();
    if (regionCode) merged.regionCode = String(regionCode);

    return apiOk(
      asApiEnvelope<PaginatedResponse<Recording>>(
        apiFetchLoose.GET('/api/Recording/search-by-filter', {
          params: { query: openApiQueryRecord(merged) },
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

  // Get popular recordings
  getPopularRecordings: async (limit: number = 10) => {
    return apiOk(
      asApiEnvelope<ApiResponse<Recording[]>>(
        apiFetchLoose.GET('/api/Recording/search-by-filter', {
          params: { query: { sortBy: 'popular', limit } },
        }),
      ),
    );
  },

  // Get recent recordings
  getRecentRecordings: async (limit: number = 10) => {
    return apiOk(
      asApiEnvelope<ApiResponse<Recording[]>>(
        apiFetchLoose.GET('/api/Recording/search-by-filter', {
          params: { query: { sortBy: 'recent', limit } },
        }),
      ),
    );
  },

  // Get featured recordings
  getFeaturedRecordings: async (limit: number = 10) => {
    return apiOk(
      asApiEnvelope<ApiResponse<Recording[]>>(
        apiFetchLoose.GET('/api/Recording/search-by-filter', {
          params: { query: { sortBy: 'featured', limit } },
        }),
      ),
    );
  },
};
