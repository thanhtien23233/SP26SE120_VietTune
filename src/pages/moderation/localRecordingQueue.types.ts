import type { ModerationVerificationData } from "@/services/expertWorkflowService";
import type { ModerationStatus } from "@/types";

/** Queue / overlay shape for expert moderation list items (aligned with expertWorkflowService). */
export interface LocalRecordingMini {
    id?: string;
    title?: string;
    mediaType?: "audio" | "video" | "youtube";
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
    uploader?: { id?: string; username?: string };
    moderation?: {
        status?: ModerationStatus | string;
        claimedBy?: string | null;
        claimedByName?: string | null;
        claimedAt?: string | null;
        reviewerId?: string | null;
        reviewerName?: string | null;
        reviewedAt?: string | null;
        verificationStep?: number;
        verificationData?: ModerationVerificationData;
        rejectionNote?: string;
        notes?: string;
        contributorEditLocked?: boolean;
        assignBlockedByRbac?: boolean;
    };
    resubmittedForModeration?: boolean;
}
