import type { LocalRecording } from '@/types';

/** Local recording storage (legacy + optional fields). */
export type LocalRecordingStorage = LocalRecording & {
  uploadedAt?: string;
  culturalContext?: {
    ethnicity?: string;
  };
};

/** Shape when loading from storage/session (extra fields vs `LocalRecording`). */
export type LoadedRecording = LocalRecordingStorage & {
  recordingId?: string;
  submissionId?: string;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  basicInfo?: {
    composer?: string;
    language?: string;
    dateEstimated?: boolean;
    dateNote?: string;
    recordingLocation?: string;
  };
  additionalNotes?: { description?: string; fieldNotes?: string; transcription?: string };
  adminInfo?: { collector?: string; copyright?: string; archiveOrg?: string; catalogId?: string };
  file?: {
    name?: string;
    size?: number;
    type?: string;
    duration?: number;
    bitrate?: number;
    sampleRate?: number;
  };
  culturalContext?: NonNullable<LocalRecordingStorage['culturalContext']> & {
    communeId?: string | null;
    ethnicGroupId?: string | null;
    ceremonyId?: string | null;
    vocalStyleId?: string | null;
    musicalScaleId?: string | null;
  };
  videoFileUrl?: string | null;
  audioFileUrl?: string | null;
};
