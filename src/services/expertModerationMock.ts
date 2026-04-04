import { ModerationStatus, type LocalRecording } from "@/types";

const now = Date.now();

export function buildMockExpertQueue(): LocalRecording[] {
  return [
    {
      id: "mock-sub-001",
      submissionId: "mock-sub-001",
      title: "Hát Then - Lạng Sơn",
      mediaType: "audio",
      audioUrl: "https://samplelib.com/lib/preview/mp3/sample-3s.mp3",
      uploadedDate: new Date(now - 1000 * 60 * 20).toISOString(),
      basicInfo: { title: "Hát Then - Lạng Sơn", artist: "Nông Văn A" },
      uploader: { id: "u-mock-01", username: "khach_001" },
      culturalContext: {
        ethnicity: "Tày",
        region: "Đông Bắc",
        eventType: "Nghi lễ",
        instruments: ["Đàn tính"],
      },
      moderation: { status: ModerationStatus.PENDING_REVIEW },
    },
    {
      id: "mock-sub-002",
      submissionId: "mock-sub-002",
      title: "Múa cồng chiêng Tây Nguyên",
      mediaType: "video",
      videoData: "https://samplelib.com/lib/preview/mp4/sample-5s.mp4",
      uploadedDate: new Date(now - 1000 * 60 * 90).toISOString(),
      basicInfo: { title: "Múa cồng chiêng Tây Nguyên", artist: "Y Bih" },
      uploader: { id: "u-mock-02", username: "khach_002" },
      culturalContext: {
        ethnicity: "Ê Đê",
        region: "Tây Nguyên",
        eventType: "Lễ hội",
        instruments: ["Cồng chiêng"],
      },
      moderation: { status: ModerationStatus.IN_REVIEW, claimedBy: "expert-mock-01" },
    },
    {
      id: "mock-sub-003",
      submissionId: "mock-sub-003",
      title: "Lý kéo chài",
      mediaType: "audio",
      audioUrl: "https://samplelib.com/lib/preview/mp3/sample-6s.mp3",
      uploadedDate: new Date(now - 1000 * 60 * 180).toISOString(),
      basicInfo: { title: "Lý kéo chài", artist: "Trần Thị B" },
      uploader: { id: "u-mock-03", username: "khach_003" },
      culturalContext: {
        ethnicity: "Kinh",
        region: "Nam Trung Bộ",
        eventType: "Sinh hoạt cộng đồng",
        instruments: ["Trống", "Sáo"],
      },
      moderation: { status: ModerationStatus.TEMPORARILY_REJECTED, reviewerId: "expert-mock-02" },
    },
  ];
}
