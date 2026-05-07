import { memo } from 'react';

import { ModerationHeroSection } from '@/components/features/moderation/ModerationHeroSection';
import { ModerationWorkspaceTabs } from '@/components/features/moderation/ModerationWorkspaceTabs';
import { useModerationDetailViewModel } from '@/features/moderation/hooks/useModerationDetailViewModel';
import type { LocalRecordingMini } from '@/features/moderation/types/localRecordingQueue.types';
import type { ModerationVerificationData } from '@/services/expertWorkflowService';
import { UserRole } from '@/types';

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
  currentVerificationStep?: number;
  verificationData?: ModerationVerificationData;
}

/**
 * Selected submission detail for the expert **Review** tab: hero workspace + tabbed secondary panels.
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
  currentVerificationStep,
  verificationData,
}: ModerationDetailViewProps) {
  const vm = useModerationDetailViewModel({
    item,
    selectedItemFull,
    currentUserId,
    userRole,
    currentVerificationStep,
    verificationData,
  });

  return (
    <div className="space-y-4 pb-20 sm:space-y-5 sm:pb-5">
      <ModerationHeroSection
        item={item}
        displayTitle={vm.displayTitle}
        headerMetaLine={vm.headerMetaLine}
        metadataHealthLabel={vm.metadataHealthLabel}
        metadataHealthOk={vm.metadataHealthOk}
        claimedByCurrentUser={vm.claimedByCurrentUser}
        stageStep={vm.stageStep}
        verificationData={vm.verificationDataResolved}
        currentUserId={currentUserId}
        onAssign={onAssign}
        onUnclaim={onUnclaim}
        onOpenWizard={onOpenWizard}
        onRequestDelete={onRequestDelete}
        mediaSrc={vm.mediaSrc}
        isVideo={vm.isVideo}
        convertedForPlayer={vm.convertedForPlayer}
        mediaTitle={item.basicInfo?.title || item.title}
        mediaArtist={item.basicInfo?.artist}
      />

      <ModerationWorkspaceTabs
        item={item}
        currentUserId={currentUserId}
        expertReviewNotesDraft={expertReviewNotesDraft}
        onExpertReviewNotesChange={onExpertReviewNotesChange}
        infoRows={vm.infoRows}
        crossCaseWarning={vm.crossCaseWarning}
        tabVisibility={vm.tabVisibility}
        defaultTab={vm.defaultTab}
        canEditEmbargo={vm.canEditEmbargo}
        recordingId={item.id ?? ''}
        declaredInstruments={item.culturalContext?.instruments ?? []}
      />
    </div>
  );
}

export default memo(ModerationDetailView);
