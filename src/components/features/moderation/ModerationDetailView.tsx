import { Music, User as UserIcon } from 'lucide-react';
import { memo } from 'react';

import EmbargoSection from '@/components/features/moderation/EmbargoSection';
import { ModerationClaimActions } from '@/components/features/moderation/ModerationClaimActions';
import { ModerationDetailMedia } from '@/components/features/moderation/ModerationDetailMedia';
import { ModerationSubmissionDetailPanels } from '@/components/features/moderation/ModerationSubmissionDetailPanels';
import SubmissionVersionTimeline from '@/components/features/submission/SubmissionVersionTimeline';
import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import {
  cleanInstrumentList,
  cleanMetadataText,
  isPlaceholderField,
} from '@/features/moderation/utils/moderationDisplayMerge';
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
import { formatDateTime } from '@/utils/helpers';
import { buildTagsFromLocal } from '@/utils/recordingTags';
import { isYouTubeUrl } from '@/utils/youtube';

type RecordingWithLocalData = Recording & {
  _originalLocalData?: LocalRecordingMini & {
    culturalContext?: {
      region?: string;
    };
  };
};

export interface ModerationDetailViewProps {
  item: LocalRecordingMini;
  selectedItemFull: LocalRecordingMini | null;
  currentUserId?: string;
  userRole: UserRole;
  expertReviewNotesDraft: string;
  onExpertReviewNotesChange: (submissionId: string, text: string) => void;
  onAssign: (id?: string) => void | Promise<void>;
  onUnclaim: (id?: string) => void;
  onOpenWizard: (id?: string) => void;
  onRequestDelete: (id: string) => void;
}

function buildConvertedRecording(
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

function resolveMediaSource(item: LocalRecordingMini): { mediaSrc: string | undefined; isVideo: boolean } {
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

/**
 * Selected submission detail for the expert **Review** tab: header, media, metadata panels, embargo, version timeline.
 */
function ModerationDetailView({
  item,
  selectedItemFull,
  currentUserId,
  userRole,
  expertReviewNotesDraft,
  onExpertReviewNotesChange,
  onAssign,
  onUnclaim,
  onOpenWizard,
  onRequestDelete,
}: ModerationDetailViewProps) {
  const { mediaSrc, isVideo } = resolveMediaSource(item);
  const convertedForPlayer = buildConvertedRecording(item, selectedItemFull);

  const ethnicityLabel = cleanMetadataText(item.culturalContext?.ethnicity);
  const regionLabel = cleanMetadataText(item.culturalContext?.province || item.culturalContext?.region);
  const eventTypeLabel = cleanMetadataText(item.culturalContext?.eventType);
  const instrumentsLabel = cleanInstrumentList(item.culturalContext?.instruments);
  const uploadedAtLabel = formatDateTime(
    (item as LocalRecordingMini & { uploadedDate?: string }).uploadedDate || item.uploadedAt,
  );
  const headerMetaParts = [ethnicityLabel, regionLabel, uploadedAtLabel].filter(
    (x) => !isPlaceholderField(x),
  );
  const infoRows = [
    {
      key: 'uploader',
      icon: UserIcon,
      label: 'Người đóng góp',
      value: item.uploader?.username || 'Khách',
    },
    {
      key: 'instruments',
      icon: Music,
      label: 'Nhạc cụ',
      value: instrumentsLabel,
    },
    {
      key: 'event-type',
      icon: null,
      label: 'Loại sự kiện',
      value: eventTypeLabel,
    },
  ] as const;
  const missingInfoCount = infoRows.filter((row) => isPlaceholderField(row.value)).length;
  const headerMetadataSparse = headerMetaParts.length < 2;
  const metadataHealthLabel =
    missingInfoCount === 0 && !headerMetadataSparse
      ? 'Metadata đầy đủ'
      : `Thiếu metadata (${missingInfoCount + (headerMetadataSparse ? 1 : 0)})`;

  const canEditEmbargo = userRole === UserRole.EXPERT || userRole === UserRole.ADMIN;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-neutral-200/80 shadow-md overflow-hidden bg-gradient-to-br from-neutral-800 to-neutral-900 text-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold mb-1">
              {item.basicInfo?.title || item.title || 'Không có tiêu đề'}
            </h2>
            <p className="text-sm text-white/80">
              {headerMetaParts.length > 0 ? headerMetaParts.join(' • ') : 'Chưa có metadata chính'}
            </p>
            <p
              className={`mt-1 text-xs ${missingInfoCount === 0 && !headerMetadataSparse ? 'text-emerald-200/90' : 'text-amber-200/95'}`}
            >
              {metadataHealthLabel}
            </p>
          </div>
          <ModerationClaimActions
            item={item}
            currentUserId={currentUserId}
            onAssign={onAssign}
            onUnclaim={onUnclaim}
            onOpenWizard={onOpenWizard}
            onRequestDelete={onRequestDelete}
          />
        </div>
        <ModerationDetailMedia
          mediaSrc={mediaSrc}
          isVideo={isVideo}
          title={item.basicInfo?.title || item.title}
          artist={item.basicInfo?.artist}
          recording={convertedForPlayer}
        />
      </div>
      <ModerationSubmissionDetailPanels
        item={item}
        currentUserId={currentUserId}
        expertReviewNotesDraft={expertReviewNotesDraft}
        onExpertReviewNotesChange={onExpertReviewNotesChange}
        infoRows={infoRows}
      />
      {item.id && (
        <>
          <div className="hidden sm:block">
            <EmbargoSection recordingId={item.id} canEdit={canEditEmbargo} />
          </div>
          <details className="sm:hidden rounded-2xl border border-neutral-200/80 bg-surface-panel p-3 shadow-sm">
            <summary className="cursor-pointer text-sm font-semibold text-neutral-800">
              Hạn chế công bố (Embargo)
            </summary>
            <div className="mt-3">
              <EmbargoSection recordingId={item.id} canEdit={canEditEmbargo} />
            </div>
          </details>
        </>
      )}
      {item.id && (
        <div className="hidden sm:block rounded-2xl border border-neutral-200/80 bg-surface-panel p-4 shadow-sm">
          <SubmissionVersionTimeline submissionId={item.id} canDelete={false} />
        </div>
      )}
      {item.id && (
        <details className="sm:hidden rounded-2xl border border-neutral-200/80 bg-surface-panel p-3 shadow-sm">
          <summary className="cursor-pointer text-sm font-semibold text-neutral-800">
            Lịch sử phiên bản
          </summary>
          <div className="mt-3">
            <SubmissionVersionTimeline submissionId={item.id} canDelete={false} />
          </div>
        </details>
      )}
    </div>
  );
}

export default memo(ModerationDetailView);
