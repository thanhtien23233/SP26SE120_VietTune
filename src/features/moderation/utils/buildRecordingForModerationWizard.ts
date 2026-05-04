import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import { Region, RecordingQuality, RecordingType, UserRole, VerificationStatus } from '@/types';
import type { Recording } from '@/types';
import type { LocalRecording } from '@/types';
import { buildTagsFromLocal } from '@/utils/recordingTags';

function sanitizeExpertTagList(tags: string[]): string[] {
  const seen = new Set<string>();
  return tags
    .map((t) => String(t).trim())
    .filter((t) => t.length > 0 && !/^ID:/i.test(t))
    .filter((t) => {
      if (seen.has(t)) return false;
      seen.add(t);
      return true;
    });
}

function ethnicityDisplayName(raw: string | undefined): string {
  const t = raw?.trim() ?? '';
  if (!t || /^ID:/i.test(t)) return 'Không xác định';
  return t;
}

/** Minimal `Recording` shape for AudioPlayer/VideoPlayer inside the verification wizard. */
export function buildRecordingForModerationWizard(
  item: LocalRecordingMini,
  opts?: { culturalContext?: LocalRecordingMini['culturalContext'] },
): Recording {
  const ctx = opts?.culturalContext ?? item.culturalContext;
  const forTags: LocalRecordingMini = { ...item, culturalContext: ctx };
  let tags = sanitizeExpertTagList(buildTagsFromLocal(forTags));
  const ethLabel = ethnicityDisplayName(ctx?.ethnicity);
  if (ethLabel !== 'Không xác định') {
    tags = tags.filter((t) => t !== ethLabel);
  }
  const regionForDisplay =
    ctx?.region?.trim() && !/^ID:/i.test(ctx.region.trim()) ? ctx.region.trim() : undefined;

  return {
    id: item.id ?? '',
    title: item.basicInfo?.title || item.title || 'Không có tiêu đề',
    titleVietnamese: item.basicInfo?.title || item.title || 'Không có tiêu đề',
    description: 'Bản thu đang chờ kiểm duyệt',
    ethnicity: {
      id: 'local',
      name: ethLabel,
      nameVietnamese: ethLabel,
      region: Region.RED_RIVER_DELTA,
      recordingCount: 0,
    },
    region: Region.RED_RIVER_DELTA,
    recordingType: RecordingType.OTHER,
    duration: typeof item.duration === 'number' ? item.duration : 0,
    audioUrl: item.audioData ?? item.audioUrl ?? '',
    instruments: [],
    performers: [],
    uploadedDate: item.uploadedAt || new Date().toISOString(),
    uploader: {
      id: item.uploader?.id || 'local-user',
      username: item.uploader?.username || 'Khách',
      email: '',
      fullName: item.uploader?.username || 'Khách',
      role: UserRole.USER,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    tags,
    metadata: { recordingQuality: RecordingQuality.FIELD_RECORDING, lyrics: '' },
    verificationStatus:
      item.moderation?.status === 'APPROVED'
        ? VerificationStatus.VERIFIED
        : VerificationStatus.PENDING,
    viewCount: 0,
    likeCount: 0,
    downloadCount: 0,
    ...(regionForDisplay
      ? {
          _originalLocalData: {
            culturalContext: { region: regionForDisplay },
            region: regionForDisplay,
          } as LocalRecording,
        }
      : {}),
  } as Recording;
}
