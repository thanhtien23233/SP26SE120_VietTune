/**
 * Per-recording local storage to avoid OOM: never load all media blobs at once.
 * - localRecordingIds: JSON array of IDs
 * - localRecording_meta:{id}: metadata only (no audioData/videoData)
 * - localRecording_full:{id}: full record including media
 */

import { api } from "@/services/api";
import type { LocalRecording } from "@/types";

// NOTE: Since we are moving entirely to the backend, these functions now serve as thin adapters
// mapping the old LocalRecording functions to the new Submission and Recording APIs.

export async function getLocalRecordingIds(): Promise<string[]> {
  try {
    const res = await api.get<{ data: any[] }>("/Submission/my");
    return (res.data || []).map((x: any) => x.id);
  } catch (err) {
    console.warn("Failed to get submission IDs", err);
    return [];
  }
}

export async function getLocalRecordingMetaList(): Promise<LocalRecording[]> {
  try {
    const res = await api.get<{ data: any[] }>("/Submission/my");
    return (res.data || []).map((x: any) => ({
      id: x.id,
      title: x.title || "Không có tiêu đề",
      mediaType: x.audioFileUrl ? "audio" : x.videoFileUrl ? "video" : undefined,
      audioUrl: x.audioFileUrl,
      videoData: x.videoFileUrl,
      moderation: { status: x.status || "PENDING" },
      uploadedDate: x.createdAt || new Date().toISOString(),
      basicInfo: { title: x.title, artist: x.performerName },
      uploader: { id: x.uploadedById }
    } as unknown as LocalRecording));
  } catch (err) {
    console.warn("Failed to get submissions list", err);
    return [];
  }
}

export async function getLocalRecordingFull(
  id: string,
): Promise<LocalRecording | null> {
  try {
    // Try to get submission first
    const res = await api.get<{ data: any }>(`/Submission/${id}`);
    const x = res.data;
    if (!x) return null;
    return {
      id: x.id,
      title: x.title || "Không có tiêu đề",
      mediaType: x.audioFileUrl ? "audio" : x.videoFileUrl ? "video" : undefined,
      audioUrl: x.audioFileUrl,
      videoData: x.videoFileUrl,
      moderation: { status: x.status || "PENDING" },
      uploadedDate: x.createdAt || new Date().toISOString(),
      basicInfo: { title: x.title, artist: x.performerName },
      uploader: { id: x.uploadedById }
    } as unknown as LocalRecording;
  } catch (err) {
    return null;
  }
}

export async function setLocalRecording(
  recording: LocalRecording,
): Promise<void> {
  // If it has an ID and it's not a local string, it might be an update
  if (recording.id && !recording.id.startsWith("local-")) {
    try {
      await api.put(`/Recording/${recording.id}`, recording);
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
