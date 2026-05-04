import type { ApiSubmissionStatus } from '@/types/moderation';
import type { Ethnicity, Instrument, Performer, Region } from '@/types/reference';
import type { User } from '@/types/user';

export interface Recording {
  id: string;
  title: string;
  titleVietnamese?: string;
  description?: string;
  ethnicity: Ethnicity;
  region: Region;
  recordingType: RecordingType;
  duration: number;
  audioUrl: string;
  waveformUrl?: string;
  coverImage?: string;
  instruments: Instrument[];
  performers: Performer[];
  recordedDate?: string;
  uploadedDate: string;
  uploader: User;
  tags: string[];
  metadata: RecordingMetadata;
  verificationStatus: VerificationStatus;
  verifiedBy?: User;
  viewCount: number;
  likeCount: number;
  downloadCount: number;
  _semanticScore?: number;
}

export interface RecordingMetadata {
  tuningSystem?: string;
  modalStructure?: string;
  tempo?: number;
  ritualContext?: string;
  regionalVariation?: string;
  lyrics?: string;
  lyricsTranslation?: string;
  transcription?: string;
  culturalSignificance?: string;
  historicalContext?: string;
  recordingQuality: RecordingQuality;
  originalSource?: string;
}

export enum RecordingType {
  INSTRUMENTAL = 'INSTRUMENTAL',
  VOCAL = 'VOCAL',
  CEREMONIAL = 'CEREMONIAL',
  FOLK_SONG = 'FOLK_SONG',
  EPIC = 'EPIC',
  LULLABY = 'LULLABY',
  WORK_SONG = 'WORK_SONG',
  OTHER = 'OTHER',
}

export enum RecordingQuality {
  PROFESSIONAL = 'PROFESSIONAL',
  FIELD_RECORDING = 'FIELD_RECORDING',
  ARCHIVE = 'ARCHIVE',
  DIGITIZED = 'DIGITIZED',
}

export enum VerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
}

export interface LocalRecording {
  id?: string;
  submissionId?: string;
  title?: string;
  titleVietnamese?: string;
  description?: string;
  ethnicity?: Ethnicity;
  region?: Region;
  recordingType?: RecordingType;
  duration?: number;
  audioUrl?: string;
  waveformUrl?: string;
  coverImage?: string;
  instruments?: Instrument[];
  performers?: Performer[];
  recordedDate?: string;
  uploadedDate?: string;
  uploader?:
    | User
    | {
        id?: string;
        username?: string;
        email?: string;
        fullName?: string;
        role?: string;
        createdAt?: string;
        updatedAt?: string;
      };
  tags?: string[];
  metadata?: Partial<RecordingMetadata>;
  verificationStatus?: VerificationStatus;
  verifiedBy?: User;
  viewCount?: number;
  likeCount?: number;
  downloadCount?: number;
  gpsLatitude?: number | null;
  gpsLongitude?: number | null;
  basicInfo?: {
    title?: string;
    artist?: string;
    genre?: string;
    recordingDate?: string;
    recordingLocation?: string;
  };
  culturalContext?: {
    region?: string;
    ethnicity?: string;
    instruments?: string[];
    eventType?: string;
    province?: string;
    performanceType?: string;
  };
  audioData?: string | null;
  videoData?: string | null;
  youtubeUrl?: string | null;
  mediaType?: 'audio' | 'video' | 'youtube';
  moderation?: {
    /** Backend submission status (OpenAPI enum: 0..5). */
    status?: ApiSubmissionStatus;
    claimedBy?: string | null;
    claimedByName?: string | null;
    claimedAt?: string | null;
    reviewerId?: string | null;
    reviewerName?: string | null;
    reviewedAt?: string | null;
    rejectionNote?: string;
    notes?: string;
    contributorEditLocked?: boolean;
  };
  resubmittedForModeration?: boolean;
}
