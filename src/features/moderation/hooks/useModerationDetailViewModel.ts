import { Music, User as UserIcon } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMemo } from 'react';

import { MODERATION_SIMILAR_RECORDINGS_UI_ENABLED } from '@/config/moderationSimilarRecordingsUi';
import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import {
  buildConvertedRecording,
  resolveMediaSource,
} from '@/features/moderation/utils/moderationDetailRecording';
import {
  cleanInstrumentList,
  cleanMetadataText,
  isPlaceholderField,
} from '@/features/moderation/utils/moderationDisplayMerge';
import type { ModerationVerificationData } from '@/services/expertWorkflowService';
import { instrumentDetectionFlags } from '@/services/instrumentDetectionService';
import { UserRole } from '@/types';
import { detectCrossCaseWarning } from '@/utils/crossCaseInstrumentWarning';
import { formatDateTime } from '@/utils/helpers';

export type ModerationWorkspaceTabId = 'metadata' | 'similar' | 'ai' | 'timeline' | 'embargo';

export type ModerationInfoRow = {
  readonly key: string;
  readonly icon: LucideIcon | null;
  readonly label: string;
  readonly value: string;
};

export type UseModerationDetailViewModelInput = {
  item: LocalRecordingMini;
  selectedItemFull: LocalRecordingMini | null;
  currentUserId?: string;
  userRole: UserRole;
  currentVerificationStep?: number;
  verificationData?: ModerationVerificationData;
};

export type ModerationDetailViewModel = {
  displayTitle: string;
  headerMetaLine: string;
  headerMetaParts: string[];
  metadataHealthLabel: string;
  metadataHealthOk: boolean;
  infoRows: readonly ModerationInfoRow[];
  mediaSrc: string | undefined;
  isVideo: boolean;
  convertedForPlayer: ReturnType<typeof buildConvertedRecording>;
  canEditEmbargo: boolean;
  claimedByCurrentUser: boolean;
  stageStep: number;
  verificationDataResolved: ModerationVerificationData | undefined;
  showSimilarRecordings: boolean;
  aiViewAvailable: boolean;
  crossCaseWarning: string | null;
  hasRecordingId: boolean;
  tabVisibility: Record<ModerationWorkspaceTabId, boolean>;
  defaultTab: ModerationWorkspaceTabId;
};

function computeDefaultTab(visibility: Record<ModerationWorkspaceTabId, boolean>): ModerationWorkspaceTabId {
  const order: ModerationWorkspaceTabId[] = ['metadata', 'similar', 'ai', 'timeline', 'embargo'];
  for (const id of order) {
    if (visibility[id]) return id;
  }
  return 'metadata';
}

export function useModerationDetailViewModel(input: UseModerationDetailViewModelInput): ModerationDetailViewModel {
  const {
    item,
    selectedItemFull,
    currentUserId,
    userRole,
    currentVerificationStep,
    verificationData,
  } = input;

  return useMemo(() => {
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
    ] as const satisfies readonly ModerationInfoRow[];

    const missingInfoCount = infoRows.filter((row) => isPlaceholderField(row.value)).length;
    const headerMetadataSparse = headerMetaParts.length < 2;
    const metadataHealthOk = missingInfoCount === 0 && !headerMetadataSparse;
    const metadataHealthLabel = metadataHealthOk
      ? 'Metadata đầy đủ'
      : `Thiếu metadata (${missingInfoCount + (headerMetadataSparse ? 1 : 0)})`;

    const canEditEmbargo = userRole === UserRole.EXPERT || userRole === UserRole.ADMIN;
    const claimedByCurrentUser =
      !!currentUserId &&
      (item.moderation?.claimedBy === currentUserId || item.moderation?.reviewerId === currentUserId);
    const stageStep = currentVerificationStep ?? item.moderation?.verificationStep ?? 1;
    const verificationDataResolved = verificationData ?? item.moderation?.verificationData;

    const showSimilarRecordings =
      !!item.id && claimedByCurrentUser && MODERATION_SIMILAR_RECORDINGS_UI_ENABLED;
    const aiViewAvailable = !!item.id && instrumentDetectionFlags.confidenceEnabled;
    const hasRecordingId = !!item.id;

    const cross = detectCrossCaseWarning({
      instruments: item.culturalContext?.instruments ?? [],
      songSignals: [
        item.basicInfo?.genre ?? '',
        item.culturalContext?.performanceType ?? '',
        item.culturalContext?.eventType ?? '',
      ],
    });

    const tabVisibility: Record<ModerationWorkspaceTabId, boolean> = {
      metadata: true,
      similar: showSimilarRecordings,
      ai: aiViewAvailable,
      timeline: hasRecordingId,
      embargo: hasRecordingId,
    };

    return {
      displayTitle: item.basicInfo?.title || item.title || 'Không có tiêu đề',
      headerMetaLine:
        headerMetaParts.length > 0 ? headerMetaParts.join(' • ') : 'Chưa có metadata chính',
      headerMetaParts,
      metadataHealthLabel,
      metadataHealthOk,
      infoRows,
      mediaSrc,
      isVideo,
      convertedForPlayer,
      canEditEmbargo,
      claimedByCurrentUser,
      stageStep,
      verificationDataResolved,
      showSimilarRecordings,
      aiViewAvailable,
      crossCaseWarning: cross.warning ?? null,
      hasRecordingId,
      tabVisibility,
      defaultTab: computeDefaultTab(tabVisibility),
    };
  }, [
    item,
    selectedItemFull,
    currentUserId,
    userRole,
    currentVerificationStep,
    verificationData,
  ]);
}
