/**
 * Recording Image API — multipart upload & management.
 *
 * Endpoints aligned with `docs/recording_image_api_guide.md`.
 * GET/PUT/DELETE use `openapi-fetch` (`apiFetch`); multipart upload uses `legacyPost`
 * so the browser sets the multipart boundary (no manual Content-Type).
 */

import { apiFetch, apiOk, asApiEnvelope, openApiQueryRecord } from '@/api';
import { legacyPost } from '@/api/legacyHttp';
import { getHttpStatus } from '@/utils/httpError';

// ── Types ──────────────────────────────────────────────────────────────────

export interface RecordingImage {
  id: string;
  recordingId: string;
  imageUrl: string;
  caption: string | null;
  sortOrder: number;
}

interface ServiceEnvelope<T> {
  success?: boolean;
  isSuccess?: boolean;
  message?: string;
  data?: T;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function unwrap<T>(envelope: unknown): T {
  const e = envelope as ServiceEnvelope<T>;
  if (e && typeof e === 'object' && e.data !== undefined) return e.data;
  return envelope as unknown as T;
}

function mapDtoToRecordingImage(row: unknown): RecordingImage | null {
  if (!row || typeof row !== 'object') return null;
  const r = row as Record<string, unknown>;
  const id = String(r.id ?? '').trim();
  if (!id) return null;
  return {
    id,
    recordingId: String(r.recordingId ?? '').trim(),
    imageUrl: String(r.imageUrl ?? ''),
    caption: r.caption == null ? null : String(r.caption),
    sortOrder: typeof r.sortOrder === 'number' ? r.sortOrder : Number(r.sortOrder ?? 0),
  };
}

// ── Service ────────────────────────────────────────────────────────────────

export const recordingImageService = {
  /**
   * 1. Upload image for a recording (multipart/form-data).
   *    POST /api/RecordingImage/{recordingId}/upload
   */
  uploadImage: async (
    recordingId: string,
    file: File,
    caption?: string,
  ): Promise<RecordingImage> => {
    const formData = new FormData();
    formData.append('file', file);
    if (caption) formData.append('caption', caption);

    const res = await legacyPost<ServiceEnvelope<RecordingImage | Record<string, unknown>>>(
      `/RecordingImage/${encodeURIComponent(recordingId)}/upload`,
      formData,
    );
    const raw = unwrap<RecordingImage | Record<string, unknown>>(res);
    const mapped = mapDtoToRecordingImage(raw);
    if (!mapped) {
      throw new Error('Upload response missing image id');
    }
    return mapped;
  },

  /**
   * 2. Get all images for a recording (sorted by sortOrder asc).
   *    GET /api/RecordingImage/by-recording/{recordingId}
   */
  getByRecording: async (recordingId: string): Promise<RecordingImage[]> => {
    const envelope = await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.GET('/api/RecordingImage/by-recording/{recordingId}', {
          params: { path: { recordingId } },
        }),
      ),
    );
    const raw = unwrap<unknown[]>(envelope) ?? [];
    if (!Array.isArray(raw)) return [];
    return raw.map(mapDtoToRecordingImage).filter((x): x is RecordingImage => x !== null);
  },

  /**
   * 3. Get primary image (sortOrder = 0) for a recording.
   *    GET /api/RecordingImage/primary/{recordingId}
   */
  getPrimary: async (recordingId: string): Promise<RecordingImage | null> => {
    try {
      const envelope = await apiOk(
        asApiEnvelope<unknown>(
          apiFetch.GET('/api/RecordingImage/primary/{recordingId}', {
            params: { path: { recordingId } },
          }),
        ),
      );
      const raw = unwrap(envelope);
      return mapDtoToRecordingImage(raw);
    } catch (err: unknown) {
      if (getHttpStatus(err) === 404) return null;
      throw err;
    }
  },

  /**
   * 4. Reorder images — first element becomes primary (sortOrder = 0).
   *    PUT /api/RecordingImage/reorder/{recordingId}
   */
  reorder: async (recordingId: string, imageIds: string[]): Promise<boolean> => {
    const envelope = await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.PUT('/api/RecordingImage/reorder/{recordingId}', {
          params: { path: { recordingId } },
          body: imageIds,
        }),
      ),
    );
    const v = unwrap<boolean>(envelope);
    return Boolean(v ?? true);
  },

  /**
   * 5. Delete a single image (also removes file from Supabase).
   *    DELETE /api/RecordingImage/{id}
   */
  deleteImage: async (imageId: string): Promise<boolean> => {
    const envelope = await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.DELETE('/api/RecordingImage/{id}', {
          params: { path: { id: imageId } },
        }),
      ),
    );
    const v = unwrap<boolean>(envelope);
    return Boolean(v ?? true);
  },

  /**
   * 6. Delete orphaned cloud file by URL (safe no-op if invalid).
   *    DELETE /api/RecordingImage/cloud-file?url={publicUrl}
   */
  deleteCloudFile: async (publicUrl: string): Promise<void> => {
    await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.DELETE('/api/RecordingImage/cloud-file', {
          params: { query: openApiQueryRecord({ url: publicUrl }) },
        }),
      ),
    );
  },
};

/** URLs for UI gallery: primary image first (GET `/primary` + `/by-recording`). */
export async function fetchRecordingImageDisplayUrls(recordingId: string): Promise<string[]> {
  const [primary, images] = await Promise.all([
    recordingImageService.getPrimary(recordingId),
    recordingImageService.getByRecording(recordingId),
  ]);
  const urls = images
    .map((img) => img.imageUrl)
    .filter((url): url is string => typeof url === 'string' && url.trim().length > 0);
  const primaryUrl = primary?.imageUrl?.trim();
  if (!primaryUrl) return urls;
  return [primaryUrl, ...urls.filter((u) => u !== primaryUrl)];
}
