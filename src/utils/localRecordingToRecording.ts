/**
 * Shared conversion from LocalRecording (upload/moderation storage) to Recording (display/API type).
 * Used for demo fallback when API is unavailable (HomePage, SemanticSearchPage, etc.).
 */
import { REGION_NAMES } from '@/config/constants';
import type { LocalRecording } from '@/types';
import {
  Recording,
  Region,
  RecordingType,
  RecordingQuality,
  VerificationStatus,
  UserRole,
  InstrumentCategory,
} from '@/types';
import { ModerationStatus, toModerationUiStatus } from '@/types/moderation';
import { buildTagsFromLocal } from '@/utils/recordingTags';

const getAudioDuration = (audioDataUrl: string): Promise<number> => {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => resolve(Math.floor(audio.duration)));
    audio.addEventListener('error', () => resolve(0));
    audio.src = audioDataUrl;
  });
};

export async function convertLocalToRecording(local: LocalRecording): Promise<Recording> {
  const cc = local.culturalContext;
  let duration = 0;
  const isVideo = local.mediaType === 'video' || local.mediaType === 'youtube';
  if (!isVideo && local.audioData) {
    duration = await getAudioDuration(local.audioData);
  }
  let mediaSrc: string | undefined;
  if (
    local.mediaType === 'video' &&
    local.videoData &&
    typeof local.videoData === 'string' &&
    local.videoData.trim()
  ) {
    mediaSrc = local.videoData;
  } else if (
    local.mediaType === 'audio' &&
    local.audioData &&
    typeof local.audioData === 'string' &&
    local.audioData.trim()
  ) {
    mediaSrc = local.audioData;
  } else if (local.videoData && typeof local.videoData === 'string' && local.videoData.trim()) {
    mediaSrc = local.videoData;
  } else if (local.audioData && typeof local.audioData === 'string' && local.audioData.trim()) {
    mediaSrc = local.audioData;
  }
  const isApproved = toModerationUiStatus(local.moderation?.status) === ModerationStatus.APPROVED;
  const ethnicityLabel = cc?.ethnicity?.trim();
  const ethnicityResolved =
    local.ethnicity ??
    (ethnicityLabel
      ? {
          id: 'ref',
          name: ethnicityLabel,
          nameVietnamese: ethnicityLabel,
          region: Region.RED_RIVER_DELTA,
          recordingCount: 0,
        }
      : {
          id: 'local',
          name: 'Không xác định',
          nameVietnamese: 'Không xác định',
          region: Region.RED_RIVER_DELTA,
          recordingCount: 0,
        });

  let regionResolved: Region = local.region ?? Region.RED_RIVER_DELTA;
  let regionNameExtra = '';
  if (cc?.region?.trim()) {
    const label = cc.region.trim();
    const matched = (Object.entries(REGION_NAMES) as [Region, string][]).find(
      ([, vn]) => vn === label,
    );
    if (matched) {
      regionResolved = matched[0];
    } else {
      regionNameExtra = label;
    }
  }

  const tagsBase = buildTagsFromLocal(local);
  const evt = cc?.eventType?.trim();
  const tagsWithEvent = evt && !tagsBase.some((t) => t === evt) ? [...tagsBase, evt] : tagsBase;

  const base: Recording = {
    id: local.id ?? 'local-' + Math.random().toString(36).slice(2),
    title: local.basicInfo?.title || local.title || 'Không có tiêu đề',
    titleVietnamese: local.basicInfo?.title || local.title || 'Không có tiêu đề',
    description: local.description || 'Bản thu được tải lên từ thiết bị của bạn',
    ethnicity: ethnicityResolved,
    region: regionResolved,
    recordingType: (() => {
      if (local.recordingType) return local.recordingType;
      const key = (local as LocalRecording & { culturalContext?: { performanceType?: string } })
        .culturalContext?.performanceType;
      if (key === 'instrumental') return RecordingType.INSTRUMENTAL;
      if (key === 'acappella' || key === 'vocal_accompaniment') return RecordingType.VOCAL;
      return RecordingType.OTHER;
    })(),
    duration: local.duration ?? duration,
    audioUrl: local.audioUrl ?? mediaSrc ?? '',
    instruments: local.instruments?.length
      ? local.instruments
      : (cc?.instruments ?? []).map((name, i) => ({
          id: `inst-${i}`,
          name,
          nameVietnamese: name,
          category: InstrumentCategory.IDIOPHONE,
          images: [],
          recordingCount: 0,
        })),
    performers: local.performers ?? [],
    uploadedDate: local.uploadedDate ?? new Date().toISOString(),
    uploader:
      typeof local.uploader === 'object' && local.uploader != null
        ? {
            id: local.uploader?.id ?? 'local-user',
            username: (local.uploader?.username ?? '').trim(),
            email: local.uploader?.email ?? '',
            fullName:
              (local.uploader?.fullName ?? local.uploader?.username ?? '').trim() ||
              'Không có thông tin',
            role: (typeof local.uploader?.role === 'string'
              ? local.uploader.role
              : UserRole.USER) as UserRole,
            createdAt: local.uploader?.createdAt ?? new Date().toISOString(),
            updatedAt: local.uploader?.updatedAt ?? new Date().toISOString(),
          }
        : {
            id: 'local-user',
            username: '',
            email: '',
            fullName: 'Không có thông tin',
            role: UserRole.USER,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
    tags: tagsWithEvent,
    metadata: {
      ...local.metadata,
      recordingQuality: local.metadata?.recordingQuality ?? RecordingQuality.FIELD_RECORDING,
      lyrics: local.metadata?.lyrics ?? '',
      ...(evt && !local.metadata?.ritualContext ? { ritualContext: evt } : {}),
    },
    verificationStatus:
      local.verificationStatus ??
      (isApproved ? VerificationStatus.VERIFIED : VerificationStatus.PENDING),
    viewCount: local.viewCount ?? 0,
    likeCount: local.likeCount ?? 0,
    downloadCount: local.downloadCount ?? 0,
  };

  const communeLabel = cc?.province?.trim();
  const extras: Record<string, string> = {};
  if (regionNameExtra) extras.regionName = regionNameExtra;
  if (communeLabel) extras.communeName = communeLabel;
  if (evt) extras.ceremonyName = evt;

  return { ...base, ...extras } as Recording;
}
