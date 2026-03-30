import axios from "axios";
import { api } from './api';
import { API_BASE_URL } from "@/config/constants";
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
import type { RecordingDto } from '@/services/recordingDto';

const guestApiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(obj: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const raw = obj[key];
    if (typeof raw === "string" && raw.trim()) return raw.trim();
  }
  return "";
}

function pickStringArray(obj: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const raw = obj[key];
    if (Array.isArray(raw)) {
      const arr = raw
        .map((x) => (typeof x === "string" ? x.trim() : ""))
        .filter(Boolean);
      if (arr.length > 0) return arr;
    }
    if (typeof raw === "string" && raw.trim()) {
      const arr = raw
        .split(",")
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
    pickString(normalized, ["id", "recordingId", "submissionId"]) ||
    `guest-recording-${index}`;
  const title = pickString(normalized, ["title", "titleVietnamese", "name"]) || "Không có tiêu đề";
  const audioUrl = pickString(normalized, ["audioUrl", "audioFileUrl", "audioData", "mediaUrl", "url"]);
  const uploadedDate = pickString(normalized, ["uploadedDate", "createdAt", "uploadedAt"]) || new Date(0).toISOString();
  const regionRaw = pickString(normalized, ["region", "regionCode"]);
  const regionValues = Object.values(Region);
  const region = regionValues.includes(regionRaw as Region) ? (regionRaw as Region) : Region.RED_RIVER_DELTA;

  const topLevelInstruments = pickStringArray(normalized, ["instrumentNames", "instruments", "instrumentTags"]);
  const culturalContext = asRecord(normalized.culturalContext);
  const contextInstruments = culturalContext ? pickStringArray(culturalContext, ["instruments"]) : [];
  const mergedInstrumentNames = Array.from(new Set([...topLevelInstruments, ...contextInstruments]));
  const rawTags = pickStringArray(normalized, ["tags", "tagNames", "metadataTags", "keywords"]);

  return {
    id,
    title,
    titleVietnamese: pickString(normalized, ["titleVietnamese"]),
    description: pickString(normalized, ["description"]),
    ethnicity: {
      id: pickString(normalized, ["ethnicityId"]) || "guest-ethnicity",
      name: pickString(normalized, ["ethnicityName", "ethnicity"]) || "Không xác định",
      nameVietnamese: pickString(normalized, ["ethnicityNameVietnamese", "ethnicityName", "ethnicity"]) || "Không xác định",
      region,
      recordingCount: 0,
    },
    region,
    recordingType: RecordingType.OTHER,
    duration: Number(normalized.duration ?? 0) || 0,
    audioUrl,
    waveformUrl: pickString(normalized, ["waveformUrl"]),
    coverImage: pickString(normalized, ["coverImage", "thumbnailUrl"]),
    instruments: mergedInstrumentNames.map((name, idx) => ({
      id: `guest-inst-${idx}-${name}`,
      name,
      nameVietnamese: name,
      category: InstrumentCategory.STRING,
      images: [],
      recordingCount: 0,
    })),
    performers: [],
    recordedDate: pickString(normalized, ["recordedDate", "recordingDate"]),
    uploadedDate,
    uploader: {
      id: pickString(normalized, ["uploaderId", "uploadedById"]) || "guest-uploader",
      username: pickString(normalized, ["uploaderName", "uploadedByName"]) || "guest",
      email: "",
      fullName: pickString(normalized, ["uploaderName", "uploadedByName"]) || "Guest",
      role: UserRole.USER,
      createdAt: uploadedDate,
      updatedAt: uploadedDate,
    },
    tags: rawTags,
    metadata: {
      recordingQuality: RecordingQuality.FIELD_RECORDING,
      lyrics: pickString(normalized, ["lyrics"]),
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

function toGuestPaginatedResponse(input: unknown, page: number, pageSize: number): PaginatedResponse<Recording> {
  const root = asRecord(input) ?? {};
  const rows = pickGuestRows(input);
  const pageRaw = root.page ?? asRecord(root.data)?.page;
  const pageSizeRaw = root.pageSize ?? asRecord(root.data)?.pageSize;
  const totalRaw = root.total ?? root.totalCount ?? asRecord(root.data)?.total ?? asRecord(root.data)?.totalCount;
  const total = typeof totalRaw === "number" ? totalRaw : rows.length;
  const totalPagesRaw = root.totalPages ?? asRecord(root.data)?.totalPages;
  const totalPages =
    typeof totalPagesRaw === "number"
      ? totalPagesRaw
      : Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
  return {
    items: rows,
    total,
    totalPages,
    page: typeof pageRaw === "number" ? pageRaw : page,
    pageSize: typeof pageSizeRaw === "number" ? pageSizeRaw : pageSize,
  };
}

export const recordingService = {
  // Get all recordings with pagination (backend: GET /api/Recording)
  getRecordings: async (
    page: number = 1,
    pageSize: number = 20,
    opts?: { signal?: AbortSignal },
  ) => {
    return api.get<PaginatedResponse<Recording>>(`/Recording?page=${page}&pageSize=${pageSize}`, {
      signal: opts?.signal,
    });
  },

  /**
   * Guest-only catalog (no Authorization header): GET /api/RecordingGuest
   * Uses raw axios client to avoid global auth interceptor/token injection.
   */
  getGuestRecordings: async (page: number = 1, pageSize: number = 20, opts?: { signal?: AbortSignal }) => {
    const qs = `?page=${page}&pageSize=${pageSize}`;
    const reqOpts = { signal: opts?.signal };
    try {
      const response = await guestApiClient.get<unknown>(`/RecordingGuest${qs}`, reqOpts);
      return toGuestPaginatedResponse(response.data, page, pageSize);
    } catch (primaryErr) {
      try {
        // Compatibility fallback for backends exposing camelCase route.
        const fallbackRes = await guestApiClient.get<unknown>(`/recordingGuest${qs}`, reqOpts);
        return toGuestPaginatedResponse(fallbackRes.data, page, pageSize);
      } catch {
        throw primaryErr;
      }
    }
  },

  /** Researcher: GET /api/Recording/search-by-filter — verified catalog with ID metadata filters. */
  searchRecordingsByFilter: async (query: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === "") continue;
      params.set(k, String(v));
    }
    return api.get<unknown>(`/Recording/search-by-filter?${params.toString()}`);
  },

  // Get recording by ID (backend: GET /api/Recording/{id})
  getRecordingById: async (id: string) => {
    return api.get<ApiResponse<Recording>>(`/Recording/${id}`);
  },

  // Search recordings (backend: GET /api/Search/songs with query params)
  searchRecordings: async (
    filters: SearchFilters,
    page: number = 1,
    pageSize: number = 20,
    opts?: { signal?: AbortSignal },
  ) => {
    const params = new URLSearchParams();
    if (filters.query) params.append('q', filters.query);
    params.append('page', String(page));
    params.append('pageSize', String(pageSize));
    if (filters.regions?.length) params.append('region', filters.regions.join(','));
    if (filters.recordingTypes?.length) params.append('type', filters.recordingTypes.join(','));
    if (filters.tags?.length) params.append('tags', filters.tags.join(','));
    return api.get<PaginatedResponse<Recording>>(`/Search/songs?${params.toString()}`, {
      signal: opts?.signal,
    });
  },

  // Upload new recording (backend: POST /api/Recording with JSON body)
  uploadRecording: async (data: Partial<Recording>) => {
    return api.post<ApiResponse<Recording>>('/Recording', data);
  },

  // Update recording (backend: PUT /api/Recording/{id}/upload — OpenAPI RecordingDto)
  updateRecording: async (id: string, data: RecordingDto) => {
    return api.put<ApiResponse<Recording>>(`/Recording/${id}/upload`, data);
  },

  // Create submission (backend: POST /api/Submission/create-submission)
  createSubmission: async (data: { audioFileUrl?: string; videoFileUrl?: string; uploadedById: string }) => {
    return api.post<{
      isSuccess: boolean;
      message: string;
      data: {
        audioFileUrl?: string;
        videoFileUrl?: string;
        uploadedById: string;
        submissionId: string;
        recordingId: string;
      };
    }>('/Submission/create-submission', data);
  },

  // Delete recording (backend: DELETE /api/Recording/{id})
  deleteRecording: async (id: string) => {
    return api.delete<ApiResponse<void>>(`/Recording/${id}`);
  },

  // Get popular recordings (backend: GET /api/Song/popular)
  getPopularRecordings: async (limit: number = 10) => {
    return api.get<ApiResponse<Recording[]>>(`/Song/popular?pageSize=${limit}`);
  },

  // Get recent recordings (backend: GET /api/Song/recent)
  getRecentRecordings: async (limit: number = 10) => {
    return api.get<ApiResponse<Recording[]>>(`/Song/recent?pageSize=${limit}`);
  },

  // Get featured recordings (backend: GET /api/Song/featured)
  getFeaturedRecordings: async (limit: number = 10) => {
    return api.get<ApiResponse<Recording[]>>(`/Song/featured?pageSize=${limit}`);
  },
};
