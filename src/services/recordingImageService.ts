/**
 * Recording Image API — multipart upload & management.
 *
 * Endpoints aligned with `docs/recording_image_api_guide.md`.
 * The server handles Supabase storage internally; the FE only sends
 * the raw File object via multipart/form-data.
 */

import { legacyGet, legacyPost, legacyPut, legacyDelete } from '@/api/legacyHttp';

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

function unwrap<T>(envelope: ServiceEnvelope<T>): T {
  if (envelope.data !== undefined) return envelope.data;
  return envelope as unknown as T;
}

// ── Service ────────────────────────────────────────────────────────────────

export const recordingImageService = {
  /**
   * 1. Upload image for a recording (multipart/form-data).
   *    Server stores the file in Supabase `recording-images` bucket.
   *
   *    POST /api/recordingimage/{recordingId}/upload
   */
  uploadImage: async (
    recordingId: string,
    file: File,
    caption?: string,
  ): Promise<RecordingImage> => {
    const formData = new FormData();
    formData.append('file', file);
    if (caption) formData.append('caption', caption);

    const res = await legacyPost<ServiceEnvelope<RecordingImage>>(
      `/RecordingImage/${encodeURIComponent(recordingId)}/upload`,
      formData,
    );
    return unwrap(res);
  },

  /**
   * 2. Get all images for a recording (sorted by sortOrder asc).
   *
   *    GET /api/recordingimage/by-recording/{recordingId}
   */
  getByRecording: async (recordingId: string): Promise<RecordingImage[]> => {
    const res = await legacyGet<ServiceEnvelope<RecordingImage[]>>(
      `/RecordingImage/by-recording/${encodeURIComponent(recordingId)}`,
    );
    return unwrap(res) ?? [];
  },

  /**
   * 3. Get primary image (sortOrder = 0) for a recording.
   *
   *    GET /api/recordingimage/primary/{recordingId}
   */
  getPrimary: async (recordingId: string): Promise<RecordingImage | null> => {
    try {
      const res = await legacyGet<ServiceEnvelope<RecordingImage>>(
        `/RecordingImage/primary/${encodeURIComponent(recordingId)}`,
      );
      return unwrap(res) ?? null;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } }).response?.status;
      if (status === 404) return null;
      throw err;
    }
  },

  /**
   * 4. Reorder images — first element becomes primary (sortOrder = 0).
   *
   *    PUT /api/recordingimage/reorder/{recordingId}
   */
  reorder: async (recordingId: string, imageIds: string[]): Promise<boolean> => {
    const res = await legacyPut<ServiceEnvelope<boolean>>(
      `/RecordingImage/reorder/${encodeURIComponent(recordingId)}`,
      imageIds,
    );
    return unwrap(res) ?? true;
  },

  /**
   * 5. Delete a single image (also removes file from Supabase).
   *
   *    DELETE /api/recordingimage/{imageId}
   */
  deleteImage: async (imageId: string): Promise<boolean> => {
    const res = await legacyDelete<ServiceEnvelope<boolean>>(
      `/RecordingImage/${encodeURIComponent(imageId)}`,
    );
    return unwrap(res) ?? true;
  },

  /**
   * 6. Delete orphaned cloud file by URL (safe no-op if invalid).
   *
   *    DELETE /api/recordingimage/cloud-file?url={publicUrl}
   */
  deleteCloudFile: async (publicUrl: string): Promise<void> => {
    await legacyDelete<ServiceEnvelope<unknown>>(
      '/RecordingImage/cloud-file',
      { params: { url: publicUrl } },
    );
  },
};
