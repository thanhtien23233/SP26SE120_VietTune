import type { LocalRecording } from "@/types";

/**
 * OpenAPI `RecordingDto` (VietTuneArchive v1) — additionalProperties: false.
 * Only keys allowed by the spec are sent; omit undefined/null optional fields.
 */
export type RecordingDto = {
  title?: string | null;
  description?: string | null;
  audioFileUrl?: string | null;
  videoFileUrl?: string | null;
  audioFormat?: string | null;
  durationSeconds?: number | null;
  fileSizeBytes?: number | null;
  uploadedById?: string;
  communeId?: string | null;
  ethnicGroupId?: string | null;
  ceremonyId?: string | null;
  vocalStyleId?: string | null;
  musicalScaleId?: string | null;
  performanceContext?: string | null;
  lyricsOriginal?: string | null;
  lyricsVietnamese?: string | null;
  performerName?: string | null;
  performerAge?: number | null;
  recordingDate?: string | null;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  tempo?: number | null;
  keySignature?: string | null;
  status?: number | null;
  instrumentIds?: string[] | null;
  /** Extension fields accepted by upload/update in practice */
  composer?: string | null;
  language?: string | null;
  recordingLocation?: string | null;
};

/** Map `LocalRecording` → JSON body for PUT /Recording/{id}/upload (OpenAPI RecordingDto only). */
export function buildRecordingUploadPayload(recording: LocalRecording): Record<string, unknown> {
  const uploaderId = (recording.uploader as { id?: string } | undefined)?.id;
  const duration =
    typeof recording.duration === "number" && Number.isFinite(recording.duration)
      ? Math.round(recording.duration)
      : undefined;

  const dto: RecordingDto = {
    title: recording.basicInfo?.title ?? recording.title ?? null,
    description: recording.description ?? null,
    audioFileUrl:
      typeof recording.audioUrl === "string" && !recording.audioUrl.startsWith("data:")
        ? recording.audioUrl
        : typeof recording.audioData === "string" && !recording.audioData.startsWith("data:")
          ? recording.audioData
          : null,
    videoFileUrl:
      typeof recording.videoData === "string" && !recording.videoData.startsWith("data:")
        ? recording.videoData
        : null,
    durationSeconds: duration ?? null,
    performerName: recording.basicInfo?.artist ?? null,
    recordingDate: recording.recordedDate ?? recording.basicInfo?.recordingDate ?? null,
    lyricsOriginal: recording.metadata?.lyrics ?? null,
    lyricsVietnamese: recording.metadata?.lyricsTranslation ?? null,
    performanceContext: recording.metadata?.ritualContext ?? recording.metadata?.culturalSignificance ?? null,
    tempo: recording.metadata?.tempo ?? null,
    instrumentIds:
      Array.isArray(recording.instruments) && recording.instruments.length > 0
        ? recording.instruments.map((i) => i.id).filter(Boolean)
        : null,
  };

  if (uploaderId) dto.uploadedById = uploaderId;
  const ethnicId = recording.ethnicity?.id;
  if (ethnicId) dto.ethnicGroupId = ethnicId;

  const body: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(dto)) {
    if (v !== undefined) body[k] = v;
  }
  return body;
}
