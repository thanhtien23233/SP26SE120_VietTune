import { extractSubmissionRows } from './submissionApiMapper';

import { apiFetch, apiOk, asApiEnvelope, openApiQueryRecord } from '@/api';
import type {
  ApiSubmissionActionQuery,
  ApiSubmissionGetByStatusQuery,
  ApiSubmissionMyQuery,
} from '@/api';
import { getHttpStatus } from '@/utils/httpError';

// Types matching the backend response
export interface SubmissionRecording {
  title: string | null;
  description: string | null;
  videoFileUrl: string | null;
  audioFileUrl?: string | null;
  audioFormat: string | null;
  durationSeconds: number | null;
  fileSizeBytes: number | null;
  uploadedById: string;
  communeId: string | null;
  ethnicGroupId: string | null;
  ceremonyId: string | null;
  vocalStyleId: string | null;
  musicalScaleId: string | null;
  performanceContext: string | null;
  lyricsOriginal: string | null;
  lyricsVietnamese: string | null;
  performerName: string | null;
  performerAge: number | null;
  composer: string | null;
  language: string | null;
  recordingLocation: string | null;
  recordingDate: string | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  tempo: number | null;
  keySignature: string | null;
  instrumentIds: string[];
}

export interface Submission {
  id: string;
  recordingId: string;
  contributorId: string;
  currentStage: number;
  status: number;
  notes: string | null;
  submittedAt: string;
  updatedAt: string | null;
  recording: SubmissionRecording;
}

interface SubmissionListResponse {
  isSuccess: boolean;
  message: string;
  data: Submission[];
}

interface SubmissionDetailResponse {
  isSuccess: boolean;
  message: string;
  data: Submission;
}

type SubmissionListApiResponse =
  | Submission[]
  | {
      isSuccess?: boolean;
      message?: string;
      data?: Submission[] | Record<string, unknown>[] | { items?: Record<string, unknown>[]; Items?: Record<string, unknown>[] };
      Data?: Record<string, unknown>[] | { items?: Record<string, unknown>[]; Items?: Record<string, unknown>[] };
      items?: Record<string, unknown>[];
      Items?: Record<string, unknown>[];
    };

function toSubmissionStatus(
  value: number,
): ApiSubmissionGetByStatusQuery['status'] {
  if (value === 0 || value === 1 || value === 2 || value === 3 || value === 4 || value === 5) {
    return value;
  }
  return undefined;
}

function pickField(row: Record<string, unknown> | null | undefined, ...keys: string[]): unknown {
  if (!row) return undefined;
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) return row[k];
  }
  return undefined;
}

function str(v: unknown): string {
  return v == null ? '' : String(v);
}

function strNull(v: unknown): string | null {
  if (v == null || v === '') return null;
  return String(v);
}

function numOr(v: unknown, def: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

/**
 * Map một phần tử list từ GET /Submission/my (camelCase hoặc PascalCase .NET) → Submission dùng trên ContributionsPage.
 */
export function mapSubmissionListRowToSubmission(row: Record<string, unknown>): Submission {
  const recRaw = pickField(row, 'recording', 'Recording') as Record<string, unknown> | undefined;
  const rec = recRaw && typeof recRaw === 'object' ? recRaw : undefined;

  const instrumentRaw = pickField(rec, 'instrumentIds', 'InstrumentIds');
  const instrumentIds: string[] = Array.isArray(instrumentRaw)
    ? (instrumentRaw as unknown[]).map((x) => String(x ?? '').trim()).filter(Boolean)
    : [];

  const recording: SubmissionRecording = {
    title: strNull(pickField(rec, 'title', 'Title')),
    description: strNull(pickField(rec, 'description', 'Description')),
    videoFileUrl: strNull(pickField(rec, 'videoFileUrl', 'VideoFileUrl')),
    audioFileUrl: strNull(pickField(rec, 'audioFileUrl', 'AudioFileUrl')),
    audioFormat: strNull(pickField(rec, 'audioFormat', 'AudioFormat')),
    durationSeconds:
      pickField(rec, 'durationSeconds', 'DurationSeconds') != null
        ? numOr(pickField(rec, 'durationSeconds', 'DurationSeconds'), 0)
        : null,
    fileSizeBytes:
      pickField(rec, 'fileSizeBytes', 'FileSizeBytes') != null
        ? numOr(pickField(rec, 'fileSizeBytes', 'FileSizeBytes'), 0)
        : null,
    uploadedById: str(
      pickField(rec, 'uploadedById', 'UploadedById') ??
        pickField(row, 'contributorId', 'ContributorId', 'uploadedById', 'UploadedById'),
    ),
    communeId: strNull(pickField(rec, 'communeId', 'CommuneId')),
    ethnicGroupId: strNull(pickField(rec, 'ethnicGroupId', 'EthnicGroupId')),
    ceremonyId: strNull(pickField(rec, 'ceremonyId', 'CeremonyId')),
    vocalStyleId: strNull(pickField(rec, 'vocalStyleId', 'VocalStyleId')),
    musicalScaleId: strNull(pickField(rec, 'musicalScaleId', 'MusicalScaleId')),
    performanceContext: strNull(pickField(rec, 'performanceContext', 'PerformanceContext')),
    lyricsOriginal: strNull(pickField(rec, 'lyricsOriginal', 'LyricsOriginal')),
    lyricsVietnamese: strNull(pickField(rec, 'lyricsVietnamese', 'LyricsVietnamese')),
    performerName: strNull(pickField(rec, 'performerName', 'PerformerName')),
    performerAge:
      pickField(rec, 'performerAge', 'PerformerAge') != null
        ? numOr(pickField(rec, 'performerAge', 'PerformerAge'), 0)
        : null,
    composer: strNull(pickField(rec, 'composer', 'Composer')),
    language: strNull(pickField(rec, 'language', 'Language')),
    recordingLocation: strNull(pickField(rec, 'recordingLocation', 'RecordingLocation')),
    recordingDate: strNull(pickField(rec, 'recordingDate', 'RecordingDate')),
    gpsLatitude:
      pickField(rec, 'gpsLatitude', 'GpsLatitude') != null
        ? numOr(pickField(rec, 'gpsLatitude', 'GpsLatitude'), 0)
        : null,
    gpsLongitude:
      pickField(rec, 'gpsLongitude', 'GpsLongitude') != null
        ? numOr(pickField(rec, 'gpsLongitude', 'GpsLongitude'), 0)
        : null,
    tempo:
      pickField(rec, 'tempo', 'Tempo') != null ? numOr(pickField(rec, 'tempo', 'Tempo'), 0) : null,
    keySignature: strNull(pickField(rec, 'keySignature', 'KeySignature')),
    instrumentIds,
  };

  const submissionId = str(pickField(row, 'id', 'Id'));
  const recordingId = str(
    pickField(row, 'recordingId', 'RecordingId') ?? pickField(rec, 'id', 'Id'),
  );

  return {
    id: submissionId,
    recordingId: recordingId || submissionId,
    contributorId: str(
      pickField(row, 'contributorId', 'ContributorId', 'uploadedById', 'UploadedById'),
    ),
    currentStage: numOr(pickField(row, 'currentStage', 'CurrentStage'), 0),
    status: numOr(pickField(row, 'status', 'Status'), 0),
    notes: strNull(pickField(row, 'notes', 'Notes')),
    submittedAt: str(
      pickField(row, 'submittedAt', 'SubmittedAt', 'createdAt', 'CreatedAt') ||
        new Date().toISOString(),
    ),
    updatedAt: strNull(pickField(row, 'updatedAt', 'UpdatedAt')),
    recording,
  };
}

export const submissionService = {
  /**
   * Danh sách đóng góp của user đang đăng nhập.
   * Backend đôi khi yêu cầu `userId` trên query, đôi khi lại lấy theo JWT.
   * Vì vậy FE sẽ thử theo thứ tự:
   * 1) Có `userId` (userId + page/pageSize)
   * 2) Không `userId` (chỉ page/pageSize)
   */
  getMySubmissions: async (userId: string, page: number = 1, pageSize: number = 10) => {
    const uid = userId.trim().toLowerCase();
    const attempts: ApiSubmissionMyQuery[] = [
      { page, pageSize, userId },
      { page, pageSize },
    ];

    let lastErr: unknown;
    for (let attemptIndex = 0; attemptIndex < attempts.length; attemptIndex++) {
      const params = attempts[attemptIndex];
      try {
        const raw = await apiOk(
          asApiEnvelope<SubmissionListApiResponse>(
            apiFetch.GET('/api/Submission/my', {
              params: { query: openApiQueryRecord(params) },
            }),
          ),
        );

        const env = raw as Record<string, unknown> | null;
        const rows = extractSubmissionRows(raw);
        const data = rows.map((r) => mapSubmissionListRowToSubmission(r)).filter((s) => s.id);

        const filtered = uid
          ? data.filter(
              (s) => !s.contributorId || String(s.contributorId).trim().toLowerCase() === uid,
            )
          : data;

        const isSuccess =
          env && typeof env === 'object' && 'isSuccess' in env
            ? Boolean((env as Record<string, unknown>).isSuccess)
            : true;
        const message =
          env && typeof env === 'object' && 'message' in env
            ? String((env as Record<string, unknown>).message ?? '')
            : '';

        return { isSuccess, message, data: filtered } satisfies SubmissionListResponse;
      } catch (err) {
        lastErr = err;
        const status = getHttpStatus(err);

        // Chỉ fallback khi endpoint có thể yêu cầu/không yêu cầu userId.
        // Các mã khác (401/500/...) thì không nên che giấu.
        const isFallbackable = status === 400 || status === 404;
        if (!isFallbackable || attemptIndex === attempts.length - 1) {
          throw err;
        }
      }
    }

    throw lastErr;
  },

  /** Get submissions by status (paginated) */
  getSubmissionsByStatus: async (status: number, page: number = 1, pageSize: number = 10) => {
    const params: ApiSubmissionGetByStatusQuery = {
      status: toSubmissionStatus(status),
      page,
      pageSize,
    };
    return apiOk(
      asApiEnvelope<SubmissionListResponse>(
        apiFetch.GET('/api/Submission/get-by-status', {
          params: { query: openApiQueryRecord(params) },
        }),
      ),
    );
  },

  /** Get submission detail by ID */
  getSubmissionById: async (id: string) => {
    return apiOk(
      asApiEnvelope<SubmissionDetailResponse>(
        apiFetch.GET('/api/Submission/{id}', {
          params: { path: { id } },
        }),
      ),
    );
  },

  /** Delete a submission */
  deleteSubmission: async (id: string) => {
    return apiOk(
      asApiEnvelope<{ isSuccess: boolean; message: string }>(
        apiFetch.DELETE('/api/Submission/{id}', {
          params: { path: { id } },
        }),
      ),
    );
  },

  /** Confirm submission (final step) */
  confirmSubmission: async (submissionId: string) => {
    const params: ApiSubmissionActionQuery = { submissionId };
    return apiOk(
      asApiEnvelope<{ isSuccess: boolean; message: string; data: boolean }>(
        apiFetch.PUT('/api/Submission/confirm-submit-submission', {
          params: { query: openApiQueryRecord(params) },
        }),
      ),
    );
  },

  /** Request edit for a submission (contributor asks admin for edit while pending). */
  requestEditSubmission: async (submissionId: string) => {
    const id = String(submissionId ?? '').trim();
    if (!id) {
      return Promise.reject(new Error('submissionId is required'));
    }
    const params: ApiSubmissionActionQuery = { submissionId: id };
    return apiOk(
      asApiEnvelope<{ isSuccess: boolean; message: string; data: boolean }>(
        apiFetch.PUT('/api/Submission/edit-request-submission', {
          params: { query: openApiQueryRecord(params) },
        }),
      ),
    );
  },
};
