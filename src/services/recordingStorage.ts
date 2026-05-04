/**
 * Per-recording local storage to avoid OOM: never load all media blobs at once.
 * - localRecordingIds: JSON array of IDs
 * - localRecording_meta:{id}: metadata only (no audioData/videoData)
 * - localRecording_full:{id}: full record including media
 */

import { apiFetch, apiFetchLoose, apiOk, asApiEnvelope } from '@/api';
import { buildRecordingUploadPayload } from '@/api';
import type { ApiSubmissionMyQuery } from '@/api';
import { logServiceError, logServiceWarn } from '@/services/serviceLogger';
import {
  extractSubmissionRows,
  mapSubmissionToLocalRecording,
} from '@/services/submissionApiMapper';
import type { LocalRecording } from '@/types';
import { isUuid } from '@/utils/validation';

type SubmissionListApiResponse =
  | Record<string, unknown>[]
  | {
      data?: Record<string, unknown>[] | { items?: Record<string, unknown>[]; Items?: Record<string, unknown>[] };
      Data?: Record<string, unknown>[] | { items?: Record<string, unknown>[]; Items?: Record<string, unknown>[] };
      items?: Record<string, unknown>[];
      Items?: Record<string, unknown>[];
    };

type SubmissionDetailApiResponse =
  | Record<string, unknown>
  | {
      data?: Record<string, unknown>;
      Data?: Record<string, unknown>;
    };

// NOTE: Since we are moving entirely to the backend, these functions now serve as thin adapters
// mapping the old LocalRecording functions to the new Submission and Recording APIs.

export async function getLocalRecordingIds(): Promise<string[]> {
  try {
    const params: ApiSubmissionMyQuery = {};
    const res = await apiOk(
      asApiEnvelope<SubmissionListApiResponse>(
        apiFetch.GET('/api/Submission/my', { params: { query: params } }),
      ),
    );
    return extractSubmissionRows(res)
      .map((x) => x.id as string | undefined)
      .filter((id): id is string => !!id);
  } catch (err) {
    logServiceWarn('Failed to get submission IDs', err);
    return [];
  }
}

export async function getLocalRecordingMetaList(): Promise<LocalRecording[]> {
  try {
    const params: ApiSubmissionMyQuery = {};
    const res = await apiOk(
      asApiEnvelope<SubmissionListApiResponse>(
        apiFetch.GET('/api/Submission/my', { params: { query: params } }),
      ),
    );
    return extractSubmissionRows(res).map((row) => mapSubmissionToLocalRecording(row));
  } catch (err) {
    logServiceWarn('Failed to get submissions list', err);
    return [];
  }
}

export async function getLocalRecordingFull(id: string): Promise<LocalRecording | null> {
  if (!isUuid(id)) return null;
  try {
    const res = await apiOk(
      asApiEnvelope<SubmissionDetailApiResponse>(
        apiFetch.GET('/api/Submission/{id}', { params: { path: { id } } }),
      ),
    );
    const envelope = res as Record<string, unknown>;
    const x = (envelope?.data ?? envelope?.Data ?? res) as Record<string, unknown> | null;
    if (!x || typeof x !== 'object') return null;
    return mapSubmissionToLocalRecording(x);
  } catch (err) {
    return null;
  }
}

export async function setLocalRecording(recording: LocalRecording): Promise<void> {
  // Remote update: OpenAPI PUT /Recording/{id}/upload with RecordingDto body (no extra properties).
  if (recording.id && !recording.id.startsWith('local-')) {
    try {
      const body = buildRecordingUploadPayload(recording);
      await apiOk(
        asApiEnvelope<unknown>(
          apiFetchLoose.PUT('/api/Recording/{id}/upload', {
            params: { path: { id: recording.id } },
            body,
          }),
        ),
      );
      return;
    } catch {
      // Fallback to create if update fails
    }
  }

  // Otherwise, create a new submission via recordingService / API
  try {
    const payload = {
      title: recording.basicInfo?.title || recording.title || 'Không có tiêu đề',
      description: recording.description || '',
      audioFileUrl: recording.audioData || recording.audioUrl,
      videoFileUrl: recording.videoData,
      recordDate: recording.recordedDate,
    };
    await apiOk(
      asApiEnvelope<unknown>(
        apiFetchLoose.POST('/api/Submission/create-submission', { body: payload as unknown }),
      ),
    );
  } catch (err) {
    logServiceError('Failed to post submission', err);
  }
}

export async function removeLocalRecording(id: string): Promise<void> {
  if (!isUuid(id)) return;
  try {
    await apiOk(
      asApiEnvelope<unknown>(
        apiFetch.DELETE('/api/Submission/{id}', { params: { path: { id } } }),
      ),
    );
  } catch (err) {
    logServiceError('Failed to delete submission', err);
  }
}

export async function clearAllLocalRecordings(): Promise<void> {
  throw new Error('clearAllLocalRecordings is not supported with remote submission APIs.');
}
