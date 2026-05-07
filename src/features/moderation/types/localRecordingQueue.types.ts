import type { ModerationStage } from '@/features/moderation/constants/moderationStage';
import type { ModerationVerificationData } from '@/services/expertWorkflowService';
import type { ApiSubmissionStatus, ModerationStatus } from '@/types';

/** Queue / overlay shape for expert moderation list items (aligned with expertWorkflowService). */
export interface LocalRecordingMini {
  id?: string;
  title?: string;
  mediaType?: 'audio' | 'video' | 'youtube';
  audioData?: string | null;
  audioUrl?: string;
  videoData?: string | null;
  youtubeUrl?: string | null;
  basicInfo?: {
    title?: string;
    artist?: string;
    composer?: string;
    language?: string;
    genre?: string;
    recordingDate?: string;
    dateEstimated?: boolean;
    dateNote?: string;
    recordingLocation?: string;
  };
  culturalContext?: {
    ethnicity?: string;
    region?: string;
    province?: string;
    eventType?: string;
    performanceType?: string;
    instruments?: string[];
  };
  additionalNotes?: {
    description?: string;
    fieldNotes?: string;
    transcription?: string;
    hasLyricsFile?: boolean;
  };
  adminInfo?: {
    collector?: string;
    copyright?: string;
    archiveOrg?: string;
    catalogId?: string;
  };
  uploadedAt?: string;
  /** Seconds — present when merged from API queue (`LocalRecording`). */
  duration?: number;
  uploader?: { id?: string; username?: string };
  moderation?: {
    /** Prefer backend status (0..5); tolerate legacy strings during migration. */
    status?: ApiSubmissionStatus | ModerationStatus | string | number | null;
    claimedBy?: string | null;
    claimedByName?: string | null;
    claimedAt?: string | null;
    reviewerId?: string | null;
    reviewerName?: string | null;
    reviewedAt?: string | null;
    verificationStep?: number;
    /** When BE sends Review 3 stage explicitly; UI otherwise uses `deriveModerationStage(verificationStep, workflowStage)`. */
    workflowStage?: ModerationStage | string | null;
    verificationData?: ModerationVerificationData;
    rejectionNote?: string;
    notes?: string;
    contributorEditLocked?: boolean;
  };
  resubmittedForModeration?: boolean;
}
