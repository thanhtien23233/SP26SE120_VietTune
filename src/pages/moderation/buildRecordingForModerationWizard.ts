import { buildTagsFromLocal } from "@/utils/recordingTags";
import { Region, RecordingQuality, RecordingType, UserRole, VerificationStatus } from "@/types";
import type { Recording } from "@/types";
import type { LocalRecordingMini } from "@/pages/moderation/localRecordingQueue.types";

/** Minimal `Recording` shape for AudioPlayer/VideoPlayer inside the verification wizard. */
export function buildRecordingForModerationWizard(item: LocalRecordingMini): Recording {
    return {
        id: item.id ?? "",
        title: item.basicInfo?.title || item.title || "Không có tiêu đề",
        titleVietnamese: item.basicInfo?.title || item.title || "Không có tiêu đề",
        description: "Bản thu đang chờ kiểm duyệt",
        ethnicity: {
            id: "local",
            name: item.culturalContext?.ethnicity || "Không xác định",
            nameVietnamese: item.culturalContext?.ethnicity || "Không xác định",
            region: (() => {
                const regionKey = item.culturalContext?.region as keyof typeof Region;
                return Region[regionKey] ?? Region.RED_RIVER_DELTA;
            })(),
            recordingCount: 0,
        },
        region: (() => {
            const regionKey = item.culturalContext?.region as keyof typeof Region;
            return Region[regionKey] ?? Region.RED_RIVER_DELTA;
        })(),
        recordingType: RecordingType.OTHER,
        duration: 0,
        audioUrl: item.audioData ?? "",
        instruments: [],
        performers: [],
        uploadedDate: item.uploadedAt || new Date().toISOString(),
        uploader: {
            id: item.uploader?.id || "local-user",
            username: item.uploader?.username || "Khách",
            email: "",
            fullName: item.uploader?.username || "Khách",
            role: UserRole.USER,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        },
        tags: buildTagsFromLocal(item),
        metadata: { recordingQuality: RecordingQuality.FIELD_RECORDING, lyrics: "" },
        verificationStatus: item.moderation?.status === "APPROVED" ? VerificationStatus.VERIFIED : VerificationStatus.PENDING,
        viewCount: 0,
        likeCount: 0,
        downloadCount: 0,
    } as Recording;
}
