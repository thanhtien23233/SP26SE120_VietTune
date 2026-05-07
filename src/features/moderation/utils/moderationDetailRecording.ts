import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import {
  Region,
  RecordingType,
  RecordingQuality,
  VerificationStatus,
  Recording,
  UserRole,
  RecordingMetadata,
  Instrument,
} from '@/types';
import { buildTagsFromLocal } from '@/utils/recordingTags';
import { isYouTubeUrl } from '@/utils/youtube';

type RecordingWithLocalData = Recording & {
  _originalLocalData?: LocalRecordingMini & {
    culturalContext?: {
      region?: string;
    };
  };
};

export function buildConvertedRecording(
  item: LocalRecordingMini,
  selectedItemFull: LocalRecordingMini | null,
): RecordingWithLocalData | null {
  if (!item && !selectedItemFull) return null;
  const r = selectedItemFull ?? item;
  return {
    id: r.id ?? '',
    title: r.basicInfo?.title || r.title || 'Không có tiêu đề',
    titleVietnamese: r.basicInfo?.title || r.title || 'Không có tiêu đề',
    description: '',
    ethnicity: {
      id: 'local',
      name: r.culturalContext?.ethnicity || '—',
      nameVietnamese: r.culturalContext?.ethnicity || '—',
      region: Region.RED_RIVER_DELTA,
      recordingCount: 0,
    },
    region: Region.RED_RIVER_DELTA,
    recordingType: RecordingType.OTHER,
    duration: 0,
    audioUrl: r.audioData ?? r.audioUrl ?? '',
    waveformUrl: '',
    coverImage: '',
    instruments: (r.culturalContext?.instruments || []).map((name, idx) => ({
      id: `li-${idx}`,
      name,
      nameVietnamese: name,
      category: 'STRING' as import('@/types').InstrumentCategory,
      images: [],
      recordingCount: 0,
    })) as Instrument[],
    performers: [],
    recordedDate: r.basicInfo?.recordingDate || '',
    uploadedDate: r.uploadedAt || '',
    uploader: r.uploader
      ? {
          id: (r.uploader as { id?: string }).id ?? '',
          username: (r.uploader as { username?: string }).username ?? '',
          email: '',
          fullName: (r.uploader as { username?: string }).username ?? '',
          role: UserRole.USER,
          createdAt: '',
          updatedAt: '',
        }
      : {
          id: '',
          username: '',
          email: '',
          fullName: '',
          role: UserRole.USER,
          createdAt: '',
          updatedAt: '',
        },
    tags: buildTagsFromLocal(r),
    metadata: {
      recordingQuality: RecordingQuality.FIELD_RECORDING,
      lyrics: '',
    } as RecordingMetadata,
    verificationStatus:
      r.moderation?.status === 'APPROVED' ? VerificationStatus.VERIFIED : VerificationStatus.PENDING,
    verifiedBy: undefined,
    viewCount: 0,
    likeCount: 0,
    downloadCount: 0,
    _originalLocalData: r,
  } as RecordingWithLocalData;
}

export function resolveMediaSource(item: LocalRecordingMini): { mediaSrc: string | undefined; isVideo: boolean } {
  let mediaSrc: string | undefined;
  let isVideo = false;
  if (item.mediaType === 'youtube' && item.youtubeUrl?.trim()) {
    mediaSrc = item.youtubeUrl.trim();
    isVideo = true;
  } else if (item.youtubeUrl && isYouTubeUrl(item.youtubeUrl)) {
    mediaSrc = item.youtubeUrl.trim();
    isVideo = true;
  } else if (item.mediaType === 'video' && item.videoData?.trim()) {
    mediaSrc = item.videoData;
    isVideo = true;
  } else if (item.mediaType === 'audio' && (item.audioData?.trim() || item.audioUrl?.trim())) {
    mediaSrc = item.audioData?.trim() || item.audioUrl?.trim();
  } else if (item.mediaType === 'video' && item.audioUrl?.trim()) {
    mediaSrc = item.audioUrl.trim();
    const src = mediaSrc;
    isVideo =
      isYouTubeUrl(src) ||
      /\.(mp4|mov|avi|webm|mkv|mpeg|mpg|wmv|3gp|flv)(\?|$)/i.test(src) ||
      src.startsWith('data:video/');
  } else if (item.audioUrl?.trim()) {
    mediaSrc = item.audioUrl.trim();
    const src = mediaSrc;
    isVideo =
      isYouTubeUrl(src) ||
      /\.(mp4|mov|avi|webm|mkv|mpeg|mpg|wmv|3gp|flv)(\?|$)/i.test(src) ||
      src.startsWith('data:video/');
  } else if (item.audioData?.trim()) {
    mediaSrc = item.audioData;
  } else if (item.videoData?.trim()) {
    mediaSrc = item.videoData;
    isVideo = true;
  }
  return { mediaSrc, isVideo };
}
