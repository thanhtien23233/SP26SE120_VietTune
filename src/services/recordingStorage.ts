/**
 * Per-recording local storage to avoid OOM: never load all media blobs at once.
 * - localRecordingIds: JSON array of IDs
 * - localRecording_meta:{id}: metadata only (no audioData/videoData)
 * - localRecording_full:{id}: full record including media
 */

import { api } from "@/services/api";
import { buildRecordingUploadPayload } from "@/services/recordingDto";
import {
  extractSubmissionRows,
  mapSubmissionToLocalRecording,
} from "@/services/submissionApiMapper";
import type { LocalRecording } from "@/types";

// NOTE: Since we are moving entirely to the backend, these functions now serve as thin adapters
// mapping the old LocalRecording functions to the new Submission and Recording APIs.

export async function getLocalRecordingIds(): Promise<string[]> {
  try {
    const res = await api.get<unknown>("/Submission/my");
    return extractSubmissionRows(res)
      .map((x) => x.id as string | undefined)
      .filter((id): id is string => !!id);
  } catch (err) {
    console.warn("Failed to get submission IDs", err);
    return [];
  }
}

export async function getLocalRecordingMetaList(): Promise<LocalRecording[]> {
  try {
    const res = await api.get<unknown>("/Submission/my");
    return extractSubmissionRows(res).map((row) => mapSubmissionToLocalRecording(row));
  } catch (err) {
    console.warn("Failed to get submissions list", err);
    return [];
  }
}

export async function getLocalRecordingFull(
  id: string,
): Promise<LocalRecording | null> {
  try {
    const res = await api.get<unknown>(`/Submission/${id}`);
    const envelope = res as Record<string, unknown>;
    const x = (envelope?.data ?? res) as Record<string, unknown> | null;
    if (!x || typeof x !== "object") return null;
    return mapSubmissionToLocalRecording(x);
  } catch (err) {
    return null;
  }
}

export async function setLocalRecording(
  recording: LocalRecording,
): Promise<void> {
  // Remote update: OpenAPI PUT /Recording/{id}/upload with RecordingDto body (no extra properties).
  if (recording.id && !recording.id.startsWith("local-")) {
    try {
      const body = buildRecordingUploadPayload(recording);
      await api.put(`/Recording/${recording.id}/upload`, body);
      return;
    } catch {
      // Fallback to create if update fails
    }
  }

  // Otherwise, create a new submission via recordingService / API
  try {
     const payload = {
        title: recording.basicInfo?.title || recording.title || "Không có tiêu đề",
        description: recording.description || "",
        audioFileUrl: recording.audioData || recording.audioUrl,
        videoFileUrl: recording.videoData,
        recordDate: recording.recordedDate,
     };
     await api.post("/Submission/create-submission", payload);
  } catch (err) {
    console.error("Failed to post submission", err);
  }
}

export async function removeLocalRecording(id: string): Promise<void> {
  try {
    await api.delete(`/Submission/${id}`);
  } catch (err) {
    console.error("Failed to delete submission", err);
  }
}

export async function clearAllLocalRecordings(): Promise<void> {
  // Clearing all submissions is usually an admin action, we will not map this locally
  console.log("clearAllLocalRecordings is disabled for remote API.");
}
